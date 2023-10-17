import Ably, { Types } from 'ably';

import EventEmitter, { InvalidArgumentError, inspect, type EventListener } from './utilities/EventEmitter.js';
import Locations from './Locations.js';
import Cursors from './Cursors.js';
import Members from './Members.js';
import Locks from './Locks.js';
import SpaceUpdate, { type SpacePresenceData } from './SpaceUpdate.js';

import { ERR_NOT_ENTERED_SPACE } from './Errors.js';
import { isFunction, isObject } from './utilities/is.js';

import type { SpaceOptions, SpaceMember, ProfileData } from './types.js';
import type { Subset, PresenceMember } from './utilities/types.js';

import { VERSION } from './version.js';

// Replace by ::$space when that channel tag will be available
const SPACE_CHANNEL_TAG = '-space';

const SPACE_OPTIONS_DEFAULTS = {
  offlineTimeout: 120_000,
  cursors: {
    outboundBatchInterval: 25,
    paginationLimit: 5,
  },
};

/**
 * This namespace contains the types which represent the data attached to an event emitted by a {@link Space | `Space`} instance.
 */
export namespace SpaceEvents {
  /**
   * The data attached to an {@link SpaceEventMap | `update`} event.
   */
  export interface UpdateEvent {
    /**
     * The members currently in the space.
     */
    members: SpaceMember[];
  }
}

/**
 * The property names of `SpaceEventMap` are the names of the events emitted by { @link Space }.
 */
export interface SpaceEventMap {
  /**
   * The space state was updated.
   */
  update: SpaceEvents.UpdateEvent;
}

/**
 * The current state of a {@link Space | `Space`}, as described by {@link Space.getState | `Space.getState()`}.
 */
export interface SpaceState {
  /**
   * <!-- Copied, with edits, from getState documentation -->
   * The members currently in the space. This includes members that have recently left the space, but have not yet been removed.
   */
  members: SpaceMember[];
}

/**
 * A function that can be passed to {@link Space.updateProfileData | `Space.updateProfileData()`}. It receives the existing profile data and returns the new profile data.
 *
 * @param profileData The existing profile data.
 */
export type UpdateProfileDataFunction = (profileData: ProfileData) => ProfileData;

/**
 * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/cb5de6a6a40abdcb0d9d5af825928dd62dc1ca64/content/spaces/space.textile?plain=1#L9-L22) -->
 * A space is a virtual area of your application in which realtime collaboration between users can take place. You can have any number of virtual spaces within an application, with a single space being anything from a web page, a sheet within a spreadsheet, an individual slide in a slideshow, or the entire slideshow itself.
 *
 * The following features can be implemented within a space:
 *
 * - Avatar stack, via the {@link members | `members`} property
 * - Member location, via the {@link locations | `locations`} property
 * - Live cursors, via the {@link cursors | `cursors`} property
 * - Component locking, via the {@link locks | `locks`} property
 *
 * A `Space` instance consists of a state object that represents the realtime status of all members in a given virtual space. This includes a list of which members are currently online or have recently left and each member’s location within the application. The position of members’ cursors are excluded from the space state due to their high frequency of updates. In the beta release, which UI components members have locked are also excluded from the space state.
 *
 * Space state can be {@link subscribe | subscribed} to by using a `Space` object. Alternatively, subscription listeners can be registered for individual features, such as avatar stack events and member location updates. These individual subscription listeners are intended to provide flexibility when implementing collaborative features. Individual listeners are client-side filtered events, so irrespective of whether you choose to subscribe to the space state or individual listeners, each event only counts as a single message.
 *
 * To subscribe to any events in a space, you first need to create or retrieve a space.
 *
 * <!-- END WEBSITE DOCUMENTATION -->
 *
 * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
 * An instance of a Space created using {@link default.get | spaces.get}. Inherits from {@link EventEmitter}.
 * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
 */
class Space extends EventEmitter<SpaceEventMap> {
  /**
   * @internal
   */
  readonly client: Types.RealtimePromise;
  private readonly channelName: string;
  /**
   * @internal
   */
  readonly connectionId: string | undefined;
  /**
   * The options passed to {@link default.get | `Spaces.get()`}, with default values filled in.
   */
  readonly options: SpaceOptions;
  /**
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * An instance of {@link Locations}.
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   */
  readonly locations: Locations;
  /**
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * An instance of {@link Cursors}.
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   */
  readonly cursors: Cursors;
  /**
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * An instance of {@link Members}.
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   */
  readonly members: Members;
  /**
   * The [ably-js](https://github.com/ably/ably-js) realtime channel instance that this `Cursors` instance uses for transmitting and receiving data.
   */
  readonly channel: Types.RealtimeChannelPromise;
  /**
   * Provides access to the component locking feature for this space.
   */
  readonly locks: Locks;
  /**
   * The space name passed to {@link default.get | `Spaces.get()`}.
   */
  readonly name: string;

  /** @internal */
  constructor(name: string, client: Types.RealtimePromise, options?: Subset<SpaceOptions>) {
    super();

    this.client = client;
    this.options = this.setOptions(options);
    this.connectionId = this.client.connection.id;
    this.name = name;
    this.channelName = `${name}${SPACE_CHANNEL_TAG}`;

    this.channel = this.client.channels.get(this.channelName, { params: { agent: `spaces/${VERSION}` } });
    this.onPresenceUpdate = this.onPresenceUpdate.bind(this);
    this.channel.presence.subscribe(this.onPresenceUpdate);

    this.locations = new Locations(this, this.presenceUpdate);
    this.cursors = new Cursors(this);
    this.members = new Members(this);
    this.locks = new Locks(this, this.presenceUpdate);
  }

  private presenceUpdate = ({ data, extras }: SpacePresenceData) => {
    if (!extras) {
      return this.channel.presence.update(data);
    }
    return this.channel.presence.update(Ably.Realtime.PresenceMessage.fromValues({ data, extras }));
  };

  private presenceEnter = ({ data, extras }: SpacePresenceData) => {
    if (!extras) {
      return this.channel.presence.enter(data);
    }
    return this.channel.presence.enter(Ably.Realtime.PresenceMessage.fromValues({ data, extras }));
  };

  private presenceLeave = ({ data, extras }: SpacePresenceData) => {
    if (!extras) {
      return this.channel.presence.leave(data);
    }
    return this.channel.presence.leave(Ably.Realtime.PresenceMessage.fromValues({ data, extras }));
  };

  private setOptions(options?: Subset<SpaceOptions>): SpaceOptions {
    const {
      offlineTimeout,
      cursors: { outboundBatchInterval, paginationLimit },
    } = SPACE_OPTIONS_DEFAULTS;

    return {
      offlineTimeout: options?.offlineTimeout ?? offlineTimeout,
      cursors: {
        outboundBatchInterval: options?.cursors?.outboundBatchInterval ?? outboundBatchInterval,
        paginationLimit: options?.cursors?.paginationLimit ?? paginationLimit,
      },
    };
  }

  private async onPresenceUpdate(message: PresenceMember) {
    await this.members.processPresenceMessage(message);
    await this.locations.processPresenceMessage(message);
    await this.locks.processPresenceMessage(message);
    this.emit('update', { members: await this.members.getAll() });
  }

  /**
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/cb5de6a6a40abdcb0d9d5af825928dd62dc1ca64/content/spaces/space.textile?plain=1#L43-L55) -->
   * Entering a space will register a client as a member and emit an {@link MembersEventMap.enter | `enter` } event to all subscribers. Use the `enter()` method to enter a space.
   *
   * Being entered into a space is required for members to:
   *
   * - { @link updateProfileData | Update their profile data. }
   * - { @link Locations.set | Set their location. }
   * - { @link Cursors.set | Set their cursor position. }
   *
   * The following is an example of entering a space:
   *
   * ```javascript
   * await space.enter();
   * ```
   * <!-- END WEBSITE DOCUMENTATION -->
   *
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/cb5de6a6a40abdcb0d9d5af825928dd62dc1ca64/content/spaces/space.textile?plain=1#L71-L82) -->
   * > **Moved documentation**
   * >
   * > This documentation has been moved to { @link ProfileData }.
   *
   * Profile data is returned in the payload of all space events.
   *
   * The following is an example of setting profile data when entering a space:
   *
   * ```javascript
   * await space.enter({
   *   username: 'Claire Oranges',
   *   avatar: 'https://slides-internal.com/users/coranges.png',
   * });
   * ```
   * <!-- END WEBSITE DOCUMENTATION -->
   *
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * Enter the space. Can optionally take `profileData`. This data can be an arbitrary JSON-serializable object which will be attached to the {@link SpaceMember | member object }. Returns all current space members.
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   *
   * @param profileData Data to associate with the member who is entering the space.
   */
  async enter(profileData: ProfileData = null): Promise<SpaceMember[]> {
    return new Promise((resolve) => {
      const presence = this.channel.presence;

      const presenceListener = async (presenceMessage: Types.PresenceMessage) => {
        if (
          !(
            presenceMessage.clientId == this.client.auth.clientId &&
            presenceMessage.connectionId == this.client.connection.id
          )
        ) {
          return;
        }

        presence.unsubscribe(presenceListener);

        const presenceMessages = await presence.get();

        presenceMessages.forEach((msg) => this.locks.processPresenceMessage(msg));

        const members = await this.members.getAll();
        resolve(members);
      };

      presence.subscribe(['enter', 'present'], presenceListener);

      const update = new SpaceUpdate({ self: null, extras: null });
      this.presenceEnter(update.updateProfileData(profileData));
    });
  }

  /**
   * {@label MAIN_OVERLOAD}
   *
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/cb5de6a6a40abdcb0d9d5af825928dd62dc1ca64/content/spaces/space.textile?plain=1#L86-L103) -->
   * Profile data can be updated at any point after entering a space by calling `updateProfileData()`. This will emit an `update` event. If a client hasn’t yet entered the space, `updateProfileData()` will instead {@link enter | enter the space }, with the profile data, and emit an { @link MembersEventMap.enter | `enter` } event.
   *
   * The following is an example of updating profile data:
   *
   * ```javascript
   * space.updateProfileData({
   *   username: 'Claire Lemons',
   *   avatar: 'https://slides-internal.com/users/clemons.png',
   * });
   * ```
   * A function can be passed to `updateProfileData()` in order to update a field based on the existing profile data:
   *
   * ```javascript
   * space.updateProfileData(currentProfile => {
   *   return { ...currentProfile, username: 'Clara Lemons' }
   * });
   * ```
   * <!-- END WEBSITE DOCUMENTATION -->
   *
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * Update `profileData`. This data can be an arbitrary JSON-serializable object which is attached to the {@link SpaceMember | member object }. If the connection
   * has not entered the space, calling `updateProfileData` will call `enter` instead.
   *
   * A function can also be passed in. This function will receive the existing `profileData` and lets you update based on the existing value of `profileData`:
   *
   * ```ts
   * await space.updateProfileData((oldProfileData) => {
   *   const newProfileData = getNewProfileData();
   *   return { ...oldProfileData, ...newProfileData };
   * })
   * ```
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   *
   * @param profileData The new profile data.
   */
  async updateProfileData(profileData: ProfileData): Promise<void>;
  /**
   * See the documentation for { @link updateProfileData:MAIN_OVERLOAD | the main overload }.
   *
   * @param updateFn A function which receives the existing profile data and returns the new profile data.
   */
  async updateProfileData(updateFn: UpdateProfileDataFunction): Promise<void>;
  async updateProfileData(profileDataOrUpdateFn: ProfileData | UpdateProfileDataFunction): Promise<void> {
    const self = await this.members.getSelf();

    if (!isObject(profileDataOrUpdateFn) && !isFunction(profileDataOrUpdateFn)) {
      throw new InvalidArgumentError(
        'Space.updateProfileData(): Invalid arguments: ' + inspect([profileDataOrUpdateFn]),
      );
    }

    let update = new SpaceUpdate({ self, extras: self ? this.locks.getLockExtras(self.connectionId) : null });

    if (!self) {
      const data = update.updateProfileData(
        isFunction(profileDataOrUpdateFn) ? profileDataOrUpdateFn(null) : profileDataOrUpdateFn,
      );
      await this.presenceEnter(data);
      return;
    } else {
      const data = update.updateProfileData(
        isFunction(profileDataOrUpdateFn) ? profileDataOrUpdateFn(self.profileData) : profileDataOrUpdateFn,
      );
      return this.presenceUpdate(data);
    }
  }

  /**
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/cb5de6a6a40abdcb0d9d5af825928dd62dc1ca64/content/spaces/space.textile?plain=1#L59-L67) -->
   * Leaving a space will emit a { @link MembersEventMap.leave | `leave` } event to all subscribers.
   *
   * The following is an example of explicitly leaving a space:
   *
   * ```javascript
   * await space.leave();
   * ```
   * Members will implicitly leave a space after 15 seconds if they abruptly disconnect. If experiencing network disruption, and they reconnect within 15 seconds, then they will remain part of the space and no `leave` event will be emitted.
   *
   * <!-- END WEBSITE DOCUMENTATION -->
   *
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * Leave the space. Can optionally take `profileData`. This triggers the `leave` event, but does not immediately remove the member from the space. See {@link SpaceOptions.offlineTimeout | offlineTimeout }.
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   *
   * @param profileData If specified, this updated profile data will accompany the { @link MembersEventMap.leave | `leave` } event.
   */
  async leave(profileData: ProfileData = null) {
    const self = await this.members.getSelf();

    if (!self) {
      throw ERR_NOT_ENTERED_SPACE();
    }

    const update = new SpaceUpdate({ self, extras: this.locks.getLockExtras(self.connectionId) });
    let data;

    // Use arguments so it's possible to deliberately nullify profileData on leave
    if (arguments.length > 0) {
      data = update.updateProfileData(profileData);
    } else {
      data = update.noop();
    }

    await this.presenceLeave(data);
  }

  /**
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/cb5de6a6a40abdcb0d9d5af825928dd62dc1ca64/content/spaces/space.textile?plain=1#L191-L197) -->
   * The current state of the space can be retrieved in a one-off call. This will return an array of all `member` objects currently in the space. This is a local call and retrieves the membership of the space retained in memory by the SDK.
   *
   * The following is an example of retrieving the current space state. Ths includes members that have recently left the space, but have not yet been removed:
   *
   * ```javascript
   * const spaceState = await space.getState();
   * ```
   * <!-- END WEBSITE DOCUMENTATION -->
   */
  async getState(): Promise<SpaceState> {
    const members = await this.members.getAll();
    return { members };
  }

  /**
   * {@label WITH_EVENTS}
   *
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/cb5de6a6a40abdcb0d9d5af825928dd62dc1ca64/content/spaces/space.textile?plain=1#L107-L177) -->
   * Subscribe to space state updates by registering a listener. Use the `subscribe()` method on the `space` object to receive updates.
   *
   * The following events will trigger a space event:
   *
   * - A member enters the space
   * - A member leaves the space
   * - A member is removed from the space state { @link SpaceOptions.offlineTimeout | after the offlineTimeout period } has elapsed
   * - A member updates their profile data
   * - A member sets a new location
   *
   * Space state contains a single object called `members`. Any events that trigger a change in space state will always return the current state of the space as an array of `member` objects.
   *
   * > **Note**
   * >
   * > Avatar stacks and member location events can be subscribed to using the space’s {@link members | `members` } and {@link locations | `locations` } properties.0These events are filtered versions of space state events. Only a single [message](https://ably.com/docs/channels/messages) is published per event by Ably, irrespective of whether you register listeners for space state or individual namespaces. If you register listeners for both, it is still only a single message.
   * >
   * > The key difference between the subscribing to space state or to individual feature events, is that space state events return the current state of the space as an array of all members in each event payload. Individual member and location event payloads only include the relevant data for the member that triggered the event.
   *
   * The following is an example of subscribing to space events:
   *
   * ```javascript
   * space.subscribe('update', (spaceState) => {
   *   console.log(spaceState.members);
   * });
   * ```
   * The following is an example payload of a space event.
   *
   * ```json
   * [
   *     {
   *         "clientId": "clemons#142",
   *         "connectionId": "hd9743gjDc",
   *         "isConnected": false,
   *         "lastEvent": {
   *           "name": "leave",
   *           "timestamp": 1677595689759
   *         },
   *         "location": null,
   *         "profileData": {
   *           "username": "Claire Lemons",
   *           "avatar": "https://slides-internal.com/users/clemons.png"
   *         }
   *     },
   *     {
   *         "clientId": "amint#5",
   *         "connectionId": "hg35a4fgjAs",
   *         "isConnected": true,
   *           "lastEvent": {
   *           "name": "enter",
   *         "timestamp": 173459567340
   *         },
   *         "location": null,
   *         "profileData": {
   *           "username": "Arit Mint",
   *           "avatar": "https://slides-internal.com/users/amint.png"
   *         }
   *     },
   *     ...
   * ]
   * ```
   * The following are the properties of an individual `member` within a space event payload:
   *
   * | Property            | Description                                                            | Type    |
   * |---------------------|------------------------------------------------------------------------|---------|
   * | clientId            | The [client identifier](https://ably.com/docs/auth/identified-clients) for the member.      | String  |
   * | connectionId        | The unique identifier of the member’s [connection](https://ably.com/docs/connect).          | String  |
   * | isConnected         | Whether the member is connected to Ably or not.                        | Boolean |
   * | profileData         | The optional {@link updateProfileData | profile data } associated with the member. | Object  |
   * | location            | The current { @link Locations | location } of the member.               | Object  |
   * | lastEvent.name      | The most recent event emitted by the member.                           | String  |
   * | lastEvent.timestamp | The timestamp of the most recently emitted event.                      | Number  |
   *
   * <!-- END WEBSITE DOCUMENTATION -->
   *
   * @param eventOrEvents The event name or an array of event names.  * @param listener The listener to add.
   *
   * @typeParam K A type which allows one or more names of the properties of the {@link SpaceEventMap} type.
   */
  subscribe<K extends keyof SpaceEventMap>(eventOrEvents: K | K[], listener?: EventListener<SpaceEventMap, K>): void;
  /**
   * Behaves the same as { @link subscribe:WITH_EVENTS | the overload which accepts one or more event names }, but subscribes to _all_ events.
   *
   * @param listener The listener to add.
   */
  subscribe(listener?: EventListener<SpaceEventMap, keyof SpaceEventMap>): void;
  subscribe<K extends keyof SpaceEventMap>(
    listenerOrEvents?: K | K[] | EventListener<SpaceEventMap, K>,
    listener?: EventListener<SpaceEventMap, K>,
  ) {
    try {
      super.on(listenerOrEvents, listener);
    } catch (e: unknown) {
      if (e instanceof InvalidArgumentError) {
        throw new InvalidArgumentError(
          'Space.subscribe(): Invalid arguments: ' + inspect([listenerOrEvents, listener]),
        );
      } else {
        throw e;
      }
    }
  }

  /**
   * {@label WITH_EVENTS}
   *
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/cb5de6a6a40abdcb0d9d5af825928dd62dc1ca64/content/spaces/space.textile?plain=1#L181-L187) -->
   * Unsubscribe from space events to remove previously registered listeners.
   *
   * The following is an example of removing a listener:
   *
   * ```javascript
   * space.unsubscribe('update', listener);
   * ```
   * <!-- END WEBSITE DOCUMENTATION -->
   *
   * @param eventOrEvents The event name or an array of event names.
   * @param listener The listener to remove.
   *
   * @typeParam K A type which allows one or more names of the properties of the {@link SpaceEventMap} type.
   */
  unsubscribe<K extends keyof SpaceEventMap>(eventOrEvents: K | K[], listener?: EventListener<SpaceEventMap, K>): void;
  /**
   * Behaves the same as { @link unsubscribe:WITH_EVENTS | the overload which accepts one or more event names }, but unsubscribes from _all_ events.
   *
   * @param listener The listener to remove.
   */
  unsubscribe(listener?: EventListener<SpaceEventMap, keyof SpaceEventMap>): void;
  unsubscribe<K extends keyof SpaceEventMap>(
    listenerOrEvents?: K | K[] | EventListener<SpaceEventMap, K>,
    listener?: EventListener<SpaceEventMap, K>,
  ) {
    try {
      super.off(listenerOrEvents, listener);
    } catch (e: unknown) {
      if (e instanceof InvalidArgumentError) {
        throw new InvalidArgumentError(
          'Space.unsubscribe(): Invalid arguments: ' + inspect([listenerOrEvents, listener]),
        );
      } else {
        throw e;
      }
    }
  }
}

export default Space;
