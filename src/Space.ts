import { PresenceMessage, Realtime, RealtimeClient, RealtimeChannel } from 'ably';

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

const SPACE_CHANNEL_TAG = '::$space';

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
 * The property names of `SpaceEventMap` are the names of the events emitted by {@link Space}.
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
 * A [space](https://ably.com/docs/spaces/space) is a virtual area of your application in which realtime collaboration between users can take place. You can have any number of virtual spaces within an application, with a single space being anything from a web page, a sheet within a spreadsheet, an individual slide in a slideshow, or the entire slideshow itself.
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
 */
class Space extends EventEmitter<SpaceEventMap> {
  /**
   * @internal
   */
  readonly client: RealtimeClient;
  private readonly channelName: string;

  /**
   * The options passed to {@link default.get | `Spaces.get()`}.
   */
  readonly options: SpaceOptions;
  /**
   * An instance of {@link Locations}.
   */
  readonly locations: Locations;
  /**
   * An instance of {@link Cursors}.
   */
  readonly cursors: Cursors;
  /**
   * An instance of {@link Members}.
   */
  readonly members: Members;
  /**
   * The [realtime channel instance](https://ably.com/docs/channels) that this `Space` instance uses for transmitting and receiving data.
   */
  readonly channel: RealtimeChannel;
  /**
   * An instance of {@link Locks}.
   */
  readonly locks: Locks;
  /**
   * The space name passed to {@link default.get | `Spaces.get()`}.
   */
  readonly name: string;

  /** @internal */
  constructor(name: string, client: RealtimeClient, options?: Subset<SpaceOptions>) {
    super();

    this.client = client;
    this.options = this.setOptions(options);
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

  /**
   * @internal
   */
  get connectionId(): string | undefined {
    return this.client.connection.id;
  }

  private presenceUpdate = ({ data, extras }: SpacePresenceData) => {
    if (!extras) {
      return this.channel.presence.update(data);
    }
    return this.channel.presence.update(Realtime.PresenceMessage.fromValues({ data, extras }));
  };

  private presenceEnter = ({ data, extras }: SpacePresenceData) => {
    if (!extras) {
      return this.channel.presence.enter(data);
    }
    return this.channel.presence.enter(Realtime.PresenceMessage.fromValues({ data, extras }));
  };

  private presenceLeave = ({ data, extras }: SpacePresenceData) => {
    if (!extras) {
      return this.channel.presence.leave(data);
    }
    return this.channel.presence.leave(Realtime.PresenceMessage.fromValues({ data, extras }));
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
   * Enter a space to register a client as a member and emit an {@link MembersEventMap.enter | `enter`} event to all subscribers.
   *
   * `profileData` can optionally be passed when entering a space. This data can be any arbitrary JSON-serializable object which will be attached to the {@link SpaceMember | member object}.
   *
   * Being entered into a space is required for members to:
   *
   * - {@link updateProfileData | Update their profile data.}
   * - {@link Locations.set | Set their location.}
   * - {@link Cursors.set | Set their cursor position.}
   *
   * The following is an example of entering a space and setting profile data:
   *
   * ```javascript
   * await space.enter({
   *   username: 'Claire Oranges',
   *   avatar: 'https://slides-internal.com/users/coranges.png',
   * });
   * ```
   *
   * @param profileData The data to associate with a member, such as a preferred username or profile picture.
   */
  async enter(profileData: ProfileData = null): Promise<SpaceMember[]> {
    return new Promise((resolve) => {
      const presence = this.channel.presence;

      const presenceListener = async (presenceMessage: PresenceMessage) => {
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
   * Update a member's profile data and emit an {@link MembersEventMap.updateProfile | `updateProfile`} event to all subscribers. This data can be any arbitrary JSON-serializable object which will be attached to the {@link SpaceMember | member object}.
   *
   * If the client hasn't yet entered the space, `updateProfileData()` will instead enter them into the space, with the profile data, and emit an {@link MembersEventMap.enter | `enter`} event.
   *
   * The following is an example of a member updating their profile data:
   *
   * ```javascript
   * space.updateProfileData({
   *   username: 'Claire Lime'
   * });
   * ```
   *
   * @param profileData The updated profile data to associate with a member, such as a preferred username or profile picture.
   */
  async updateProfileData(profileData: ProfileData): Promise<void>;
  /**
   * Update a member's profile data by passing a function, for example to update a field based on the member's existing profile data:
   *
   * ```javascript
   * space.updateProfileData(currentProfile => {
   *   return { ...currentProfile, username: 'Claire Lime' }
   * });
   * ```
   *
   * @param updateFn The function which receives the existing profile data and returns the new profile data.
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
   * Leave a space and emit a {@link MembersEventMap.leave | `leave`} event to all subscribers. `profileData` can optionally be updated when leaving the space.
   *
   * The member may not immediately be removed from the space, depending on the {@link SpaceOptions.offlineTimeout | offlineTimeout} configured.
   *
   * Members will implicitly leave a space after 15 seconds if they abruptly disconnect. If experiencing network disruption, and they reconnect within 15 seconds, then they will remain part of the space and no `leave` event will be emitted.
   *
   * @param profileData The updated profile data to associate with a member.
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
   * Retrieve the current state of a space in a one-off call. Returns an array of all `member` objects currently in the space. This is a local call and retrieves the membership of the space retained in memory by the SDK.
   *
   * The following is an example of retrieving space state:
   *
   * ```javascript
   * const spaceState = await space.getState();
   * ```
   */
  async getState(): Promise<SpaceState> {
    const members = await this.members.getAll();
    return { members };
  }

  /**
   * {@label WITH_EVENTS}
   *
   * Subscribe to space state updates by registering a listener for an event name, or an array of event names.
   *
   * The following events will trigger a space event:
   *
   * - A member enters the space
   * - A member leaves the space
   * - A member is removed from the space state after the {@link SpaceOptions.offlineTimeout | offlineTimeout} period has elapsed
   * - A member updates their profile data
   * - A member sets a new location
   *
   * Space state contains a single object called `members`. Any events that trigger a change in space state will always return the current state of the space as an array of `member` objects.
   *
   * > **Note**
   * >
   * > Avatar stacks and member location events can be subscribed to using the space’s {@link members | `members`} and {@link locations | `locations`} properties. These events are filtered versions of space state events. Only a single [message](https://ably.com/docs/channels/messages) is published per event by Ably, irrespective of whether you register listeners for space state or individual namespaces. If you register listeners for both, it is still only a single message.
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
   *
   * @param eventOrEvents An event name, or an array of event names.
   * @param listener An event listener.
   *
   * @typeParam K A type which allows one or more names of the properties of the {@link SpaceEventMap} type.
   */
  subscribe<K extends keyof SpaceEventMap>(eventOrEvents: K | K[], listener?: EventListener<SpaceEventMap, K>): void;
  /**
   * Subscribe to space state updates by registering a listener for all event types.
   *
   * @param listener An event listener.
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
   * Unsubscribe from specific events, or an array of event names, to remove previously registered listeners.
   *
   * The following is an example of removing a listener:
   *
   * ```javascript
   * space.unsubscribe('update', listener);
   * ```
   *
   * @param eventOrEvents An event name, or an array of event names.
   * @param listener An event listener.
   *
   * @typeParam K A type which allows one or more names of the properties of the {@link SpaceEventMap} type.
   */
  unsubscribe<K extends keyof SpaceEventMap>(eventOrEvents: K | K[], listener?: EventListener<SpaceEventMap, K>): void;
  /**
   * Unsubscribe from all events to remove previously registered listeners.
   *
   * The following is an example of removing a listener for all events:
   *
   * ```javascript
   * space.unsubscribe(listener);
   * ```
   *
   * @param listener An event listener.
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
