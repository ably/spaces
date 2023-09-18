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

// Replace by ::$space when that channel tag will be available
const SPACE_CHANNEL_TAG = '-space';

const SPACE_OPTIONS_DEFAULTS = {
  offlineTimeout: 120_000,
  cursors: {
    outboundBatchInterval: 25,
    paginationLimit: 5,
  },
};

export namespace SpaceEvents {
  export interface UpdateEvent {
    members: SpaceMember[];
  }
}

export interface SpaceEventMap {
  update: SpaceEvents.UpdateEvent;
}

/**
 * > **Documentation source**
 * >
 * > The following documentation is copied from the [Spaces documentation website](https://ably.com/docs/spaces).
 * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/5f9e999399ebf284c0eeecff52a9d1e4d36ce8a8/content/spaces/space.textile?plain=1#L9-L22) -->
 * A space is a virtual area of your application in which realtime collaboration between users can take place. You can have any number of virtual spaces within an application, with a single space being anything from a web page, a sheet within a spreadsheet, an individual slide in a slideshow, or the entire slideshow itself.
 *
 * The following features can be implemented within a space:
 *
 * * "Avatar stack":/spaces/avatar
 * * "Member location":/spaces/locations
 * * "Live cursors":/spaces/cursors
 * * "Component locking":/spaces/locking
 *
 * The @space@ namespace consists of a state object that represents the realtime status of all members in a given virtual space. This includes a list of which members are currently online or have recently left and each member's location within the application. The position of members' cursors are excluded from the space state due to their high frequency of updates. In the beta release, which UI components members have locked are also excluded from the space state.
 *
 * Space state can be "subscribed":#subscribe to in the @space@ namespace. Alternatively, subscription listeners can be registered for individual features, such as avatar stack events and member location updates. These individual subscription listeners are intended to provide flexibility when implementing collaborative features. Individual listeners are client-side filtered events, so irrespective of whether you choose to subscribe to the space state or individual listeners, each event only counts as a single message.
 *
 * To subscribe to any events in a space, you first need to create or retrieve a space.
 * <!-- END WEBSITE DOCUMENTATION -->
 */
class Space extends EventEmitter<SpaceEventMap> {
  private readonly channelName: string;
  readonly connectionId: string | undefined;
  readonly options: SpaceOptions;
  readonly locations: Locations;
  readonly cursors: Cursors;
  readonly members: Members;
  readonly channel: Types.RealtimeChannelPromise;
  readonly locks: Locks;
  readonly name: string;

  /** @internal */
  constructor(name: string, readonly client: Types.RealtimePromise, options?: Subset<SpaceOptions>) {
    super();

    this.options = this.setOptions(options);
    this.connectionId = this.client.connection.id;
    this.name = name;
    this.channelName = `${name}${SPACE_CHANNEL_TAG}`;

    this.channel = this.client.channels.get(this.channelName);
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
   * > **Documentation source**
   * >
   * > The following documentation is copied from the [Spaces documentation website](https://ably.com/docs/spaces).
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/5f9e999399ebf284c0eeecff52a9d1e4d36ce8a8/content/spaces/space.textile?plain=1#L43-L55) -->
   * Entering a space will register a client as a member and emit an "@enter@":/spaces/members#events event to all subscribers. Use the @enter()@ method to enter a space.
   *
   * Being entered into a space is required for members to:
   *
   * * Update their "profile data":#update-profile.
   * * Set their "location":/spaces/locations.
   * * Set their "cursor position":/spaces/cursors.
   *
   * The following is an example of entering a space:
   *
   * ```[javascript]
   * await space.enter();
   * ```
   * <!-- END WEBSITE DOCUMENTATION -->
   *
   * > **Documentation source**
   * >
   * > The following documentation is copied from the [Spaces documentation website](https://ably.com/docs/spaces).
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/5f9e999399ebf284c0eeecff52a9d1e4d36ce8a8/content/spaces/space.textile?plain=1#L71-L82) -->
   * Profile data can be set when "entering":#enter a space. It is optional data that can be used to associate information with a member, such as a preferred username, or profile picture that can be subsequently displayed in their avatar. Profile data can be any arbitrary JSON-serializable object.
   *
   * Profile data is returned in the payload of all space events.
   *
   * The following is an example of setting profile data when entering a space:
   *
   * ```[javascript]
   * await space.enter({
   *   username: 'Claire Oranges',
   *   avatar: 'https://slides-internal.com/users/coranges.png',
   * });
   * ```
   * <!-- END WEBSITE DOCUMENTATION -->
   */
  async enter(profileData: ProfileData = null): Promise<SpaceMember[]> {
    return new Promise((resolve) => {
      const presence = this.channel.presence;

      interface PresenceWithSubscriptions extends Types.RealtimePresencePromise {
        subscriptions: EventEmitter<{ enter: [unknown] }>;
      }

      (presence as PresenceWithSubscriptions).subscriptions.once('enter', async () => {
        const presenceMessages = await presence.get();

        presenceMessages.forEach((msg) => this.locks.processPresenceMessage(msg));

        const members = await this.members.getAll();
        resolve(members);
      });

      const update = new SpaceUpdate({ self: null, extras: null });
      this.presenceEnter(update.updateProfileData(profileData));
    });
  }

  /**
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/5f9e999399ebf284c0eeecff52a9d1e4d36ce8a8/content/spaces/space.textile?plain=1#L86-L103) -->
   * Profile data can be updated at any point after entering a space by calling @updateProfileData()@. This will emit an @update@ event. If a client hasn't yet entered the space, @updateProfileData()@ will instead "enter the space":#enter, with the profile data, and emit an "@enter@":/spaces/members#events event.
   *
   * The following is an example of updating profile data:
   *
   * ```[javascript]
   * space.updateProfileData({
   *   username: 'Claire Lemons',
   *   avatar: 'https://slides-internal.com/users/clemons.png',
   * });
   * ```
   *
   * A function can be passed to @updateProfileData()@ in order to update a field based on the existing profile data:
   *
   * ```[javascript]
   * space.updateProfileData(currentProfile => {
   *   return { ...currentProfile, username: 'Clara Lemons' }
   * });
   * ```
   * <!-- END WEBSITE DOCUMENTATION -->
   */
  async updateProfileData(profileDataOrUpdateFn: ProfileData | ((update: ProfileData) => ProfileData)): Promise<void> {
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

  /*
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/5f9e999399ebf284c0eeecff52a9d1e4d36ce8a8/content/spaces/space.textile?plain=1#L59-L67) -->
   * Leaving a space will emit a "@leave@":/spaces/members#events event to all subscribers.
   *
   * The following is an example of explicitly leaving a space:
   *
   * ```[javascript]
   * await space.leave();
   * ```
   *
   * Members will implicitly leave a space after 15 seconds if they abruptly disconnect. If experiencing network disruption, and they reconnect within 15 seconds, then they will remain part of the space and no @leave@ event will be emitted.
   * <!-- END WEBSITE DOCUMENTATION -->
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
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/5f9e999399ebf284c0eeecff52a9d1e4d36ce8a8/content/spaces/space.textile?plain=1#L191-L197) -->
   * The current state of the space can be retrieved in a one-off call. This will return an array of all @member@ objects currently in the space. This is a local call and retrieves the membership of the space retained in memory by the SDK.
   *
   * The following is an example of retrieving the current space state. Ths includes members that have recently left the space, but have not yet been removed:
   *
   * ```[javascript]
   * const spaceState = await space.getState();
   * ```
   * <!-- END WEBSITE DOCUMENTATION -->
   */
  async getState(): Promise<{ members: SpaceMember[] }> {
    const members = await this.members.getAll();
    return { members };
  }

  /**
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/5f9e999399ebf284c0eeecff52a9d1e4d36ce8a8/content/spaces/space.textile?plain=1#L107-L177) -->
   * Subscribe to space state updates by registering a listener. Use the @subscribe()@ method on the @space@ object to receive updates.
   *
   * The following events will trigger a space event:
   *
   * * A member enters the space
   * * A member leaves the space
   * * A member is removed from the space state "after the offlineTimeout period":#options has elapsed
   * * A member updates their profile data
   * * A member sets a new location
   *
   * Space state contains a single object called @members@. Any events that trigger a change in space state will always return the current state of the space as an array of @member@ objects.
   *
   * <aside data-type='note'>
   * <p>"Avatar stacks":/spaces/members and "member location":/spaces/locations events can be subscribed to on their individual namespaces; @space.members@ and @space.locations@. These events are filtered versions of space state events. Only a single "message":/channels/messages is published per event by Ably, irrespective of whether you register listeners for space state or individual namespaces. If you register listeners for both, it is still only a single message.</p>
   * <p>The key difference between the subscribing to space state or to individual feature events, is that space state events return the current state of the space as an array of all members in each event payload. Individual member and location event payloads only include the relevant data for the member that triggered the event.</p>
   * </aside>
   *
   * The following is an example of subscribing to space events:
   *
   * ```[javascript]
   * space.subscribe('update', (spaceState) => {
   *   console.log(spaceState.members);
   * });
   * ```
   *
   * The following is an example payload of a space event.
   *
   * ```[json]
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
   *
   * The following are the properties of an individual @member@ within a space event payload:
   *
   * |_. Property |_. Description |_. Type |
   * | clientId | The "client identifier":/auth/identified-clients for the member. | String |
   * | connectionId | The unique identifier of the member's "connection":/connect. | String |
   * | isConnected | Whether the member is connected to Ably or not. | Boolean |
   * | profileData | The optional "profile data":#profile-data associated with the member. | Object |
   * | location | The current "location":/spaces/locations of the member. | Object |
   * | lastEvent.name | The most recent event emitted by the member. | String |
   * | lastEvent.timestamp | The timestamp of the most recently emitted event. | Number |
   * <!-- END WEBSITE DOCUMENTATION -->
   */
  subscribe<K extends keyof SpaceEventMap>(eventOrEvents: K | K[], listener?: EventListener<SpaceEventMap, K>): void;
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
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/5f9e999399ebf284c0eeecff52a9d1e4d36ce8a8/content/spaces/space.textile?plain=1#L181-L187) -->
   * Unsubscribe from space events to remove previously registered listeners.
   *
   * The following is an example of removing a listener:
   *
   * ```[javascript]
   * space.unsubscribe('update', listener);
   * ```
   * <!-- END WEBSITE DOCUMENTATION -->
   */
  unsubscribe<K extends keyof SpaceEventMap>(eventOrEvents: K | K[], listener?: EventListener<SpaceEventMap, K>): void;
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
