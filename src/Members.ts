import EventEmitter, { InvalidArgumentError, inspect, type EventListener } from './utilities/EventEmitter.js';
import Leavers from './Leavers.js';

import type { SpaceMember } from './types.js';
import type { PresenceMember } from './utilities/types.js';
import type Space from './Space.js';

export interface MembersEventMap {
  /**
   * <!-- MOVED WITH EDITING FROM Members -->
   * A member has left the space. The member has either left explicitly by calling { @link Space.leave | `space.leave()` }, or has abruptly disconnected and not re-established a connection within 15 seconds.
   */
  leave: SpaceMember;
  /**
   * <!-- MOVED WITH EDITING FROM Members -->
   * A new member has entered the space. The member has either entered explicitly by calling {@link Space.enter | `space.enter()` }, or has attempted to update their profile data before entering a space, which will instead emit an `enter` event.
   */
  enter: SpaceMember;
  /**
   * <!-- MOVED WITH EDITING FROM Members -->
   * This event is emitted whenever any one of the following events is emitted:
   *
   * - {@link enter}
   * - {@link leave}
   * - {@link remove}
   * - {@link updateProfile}
   */
  update: SpaceMember;
  /**
   * <!-- MOVED WITH EDITING FROM Members -->
   * A member has updated their profile data by calling { @link Space.updateProfileData | `space.updateProfileData()` }.
   */
  updateProfile: SpaceMember;
  /**
   * <!-- MOVED WITH EDITING FROM Members -->
   * A member has been removed from the members list after the { @link SpaceOptions.offlineTimeout | `offlineTimeout` } period has elapsed. This enables members to appear greyed out in the avatar stack to indicate that they recently left for the period of time between their `leave` and `remove` events.
   */
  remove: SpaceMember;
}

/**
 * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/cb5de6a6a40abdcb0d9d5af825928dd62dc1ca64/content/spaces/avatar.textile?plain=1#L9-L25) -->
 * Avatar stacks are the most common way of showing the online status of members in an application by displaying an avatar for each member. Events are emitted whenever a member enters or leaves a space, or updates their profile data. Additional information can also be provided, such as a profile picture and email address.
 *
 * Subscribe to the space’s { @link Space.members | `members` } property in order to keep your avatar stack updated in realtime.
 *
 * ## Event types
 *
 * The following four event types are emitted by members:
 *
 * > **Moved documentation**
 * >
 * > This documentation has been moved to { @link MembersEventMap }.
 *
 * > **Note**
 * >
 * > Members {@link Space.enter | enter }, {@link Space.leave | leave }, and {@link Space.updateProfileData | update } a {@link Space | space } directly. The space’s { @link Space.members | `members` } property is used to subscribe to these updates.
 *
 * <!-- END WEBSITE DOCUMENTATION -->
 *
 * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/cb5de6a6a40abdcb0d9d5af825928dd62dc1ca64/content/spaces/avatar.textile?plain=1#L297-L301) -->
 * ## Avatar stack foundations
 *
 * The Spaces SDK is built upon existing Ably functionality available in Ably’s Core SDKs. Understanding which core features are used to provide the abstractions in the Spaces SDK enables you to manage space state and build additional functionality into your application.
 *
 * Avatar stacks build upon the functionality of the Pub/Sub Channels [presence](https://ably.com/docs/presence-occupancy/presence) feature. Members are entered into the presence set when they { @link Space.enter | enter the space }.
 *
 * <!-- END WEBSITE DOCUMENTATION -->
 *
 * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
 * Handles members within a space.
 * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
 */
class Members extends EventEmitter<MembersEventMap> {
  private lastMemberUpdate: Record<string, PresenceMember['data']['profileUpdate']['id']> = {};
  private leavers: Leavers;

  /** @internal */
  constructor(private space: Space) {
    super();
    this.leavers = new Leavers(this.space.options.offlineTimeout);
  }

  /** @internal */
  async processPresenceMessage(message: PresenceMember) {
    const { action, connectionId } = message;
    const isLeaver = !!this.leavers.getByConnectionId(connectionId);
    const member = this.createMember(message);

    if (action === 'leave') {
      this.leavers.addLeaver(member, () => this.onMemberOffline(member));
      this.emit('leave', member);
      this.emit('update', member);
    } else if (isLeaver) {
      this.leavers.removeLeaver(connectionId);
    }

    if (action === 'enter') {
      this.emit('enter', member);
      this.emit('update', member);
    }

    // Emit profileData updates only if they are different then the last held update.
    // A locationUpdate is handled in Locations.
    if (message.data.profileUpdate.id && this.lastMemberUpdate[connectionId] !== message.data.profileUpdate.id) {
      this.lastMemberUpdate[message.connectionId] = message.data.profileUpdate.id;
      this.emit('updateProfile', member);
      this.emit('update', member);
    }
  }

  /**
   * <!-- This is to avoid duplication of the website documentation. -->
   * See the documentation for {@link getAll}.
   *
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * Returns a Promise which resolves to the {@link SpaceMember} object relating to the local connection. Will resolve to `null` if the client hasn't entered the space yet.
   *
   * Example:
   *
   * ```ts
   * const myMember = await space.members.getSelf();
   * ```
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   */
  async getSelf(): Promise<SpaceMember | null> {
    return this.space.connectionId ? await this.getByConnectionId(this.space.connectionId) : null;
  }

  /**
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/cb5de6a6a40abdcb0d9d5af825928dd62dc1ca64/content/spaces/avatar.textile?plain=1#L129-L250) -->
   * Space membership can be retrieved in one-off calls. These are local calls and retrieve the membership retained in memory by the SDK. One-off calls to retrieve membership can be used for operations such as displaying a member’s own profile data to them, or retrieving a list of all other members to use to {@link Space.updateProfileData | update their profile data }.
   *
   * The following is an example of retrieving a member’s own member object:
   *
   * ```javascript
   * const myMemberInfo = await space.members.getSelf();
   * ```
   * The following is an example payload returned by `space.members.getSelf()`:
   *
   * ```json
   *   {
   *     "clientId": "clemons#142",
   *     "connectionId": "hd9743gjDc",
   *     "isConnected": true,
   *     "lastEvent": {
   *       "name": "enter",
   *       "timestamp": 1677595689759
   *     },
   *     "location": null,
   *     "profileData": {
   *       "username": "Claire Lemons",
   *       "avatar": "https://slides-internal.com/users/clemons.png"
   *     }
   *   }
   * ```
   * The following is an example of retrieving an array of member objects for all members other than the member themselves. Ths includes members that have recently left the space, but have not yet been removed.
   *
   * ```javascript
   * const othersMemberInfo = await space.members.getOthers();
   * ```
   * The following is an example payload returned by `space.members.getOthers()`:
   *
   * ```json
   * [
   *   {
   *     "clientId": "torange#1",
   *     "connectionId": "tt7233ghUa",
   *     "isConnected": true,
   *     "lastEvent": {
   *       "name": "enter",
   *       "timestamp": 167759566354
   *     },
   *     "location": null,
   *     "profileData": {
   *       "username": "Tara Orange",
   *       "avatar": "https://slides-internal.com/users/torange.png"
   *     }
   *   },
   *   {
   *       "clientId": "amint#5",
   *       "connectionId": "hg35a4fgjAs",
   *       "isConnected": true,
   *         "lastEvent": {
   *         "name": "update",
   *       "timestamp": 173459567340
   *       },
   *       "location": null,
   *       "profileData": {
   *         "username": "Arit Mint",
   *         "avatar": "https://slides-internal.com/users/amint.png"
   *       }
   *   }
   * ]
   * ```
   * The following is an example of retrieving an array of all member objects, including the member themselves. Ths includes members that have recently left the space, but have not yet been removed.
   *
   * ```javascript
   * const allMembers = await space.members.getAll();
   * ```
   * The following is an example payload returned by `space.members.getAll()`:
   *
   * ```json
   * [
   *   {
   *     "clientId": "clemons#142",
   *     "connectionId": "hd9743gjDc",
   *     "isConnected": false,
   *     "lastEvent": {
   *       "name": "enter",
   *       "timestamp": 1677595689759
   *     },
   *     "location": null,
   *     "profileData": {
   *       "username": "Claire Lemons",
   *       "avatar": "https://slides-internal.com/users/clemons.png"
   *     }
   *   },
   *   {
   *       "clientId": "amint#5",
   *       "connectionId": "hg35a4fgjAs",
   *       "isConnected": true,
   *         "lastEvent": {
   *         "name": "update",
   *       "timestamp": 173459567340
   *       },
   *       "location": null,
   *       "profileData": {
   *         "username": "Arit Mint",
   *         "avatar": "https://slides-internal.com/users/amint.png"
   *       }
   *   },
   *   {
   *     "clientId": "torange#1",
   *     "connectionId": "tt7233ghUa",
   *     "isConnected": true,
   *     "lastEvent": {
   *       "name": "enter",
   *       "timestamp": 167759566354
   *     },
   *     "location": null,
   *     "profileData": {
   *       "username": "Tara Orange",
   *       "avatar": "https://slides-internal.com/users/torange.png"
   *     }
   *   }
   * ]
   * ```
   * <!-- END WEBSITE DOCUMENTATION -->
   *
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * Returns a Promise which resolves to an array of all {@link SpaceMember} objects (members) currently in the space, including any who have left and not yet timed out. (_see: {@link SpaceOptions.offlineTimeout | offlineTimeout}_)
   *
   * Example:
   *
   * ```ts
   * const allMembers = await space.members.getAll();
   * ```
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   */
  async getAll(): Promise<SpaceMember[]> {
    const presenceMembers = await this.space.channel.presence.get();
    const members = presenceMembers.map((m) => this.createMember(m));
    return members.concat(this.leavers.getAll().map((l) => l.member));
  }

  /**
   * <!-- This is to avoid duplication of the website documentation. -->
   * See the documentation for {@link getAll}.
   *
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * Returns a Promise which resolves to an array of all {@link SpaceMember} objects (members) currently in the space, excluding your own member object.
   *
   * Example:
   *
   * ```ts
   * const otherMembers = await space.members.getOthers();
   * ```
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   */
  async getOthers(): Promise<SpaceMember[]> {
    const members = await this.getAll();
    return members.filter((m) => m.connectionId !== this.space.connectionId);
  }

  /**
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/cb5de6a6a40abdcb0d9d5af825928dd62dc1ca64/content/spaces/avatar.textile?plain=1#L29-L103) -->
   * Subscribe to members’ online status and profile updates by registering a listener. Member events are emitted whenever a member {@link Space.enter | enters} or {@link Space.leave | leaves} the space, or updates their profile data. Use the `subscribe()` method on the `members` object of a space to receive updates.
   *
   * The following is an example of subscribing to the different member event types:
   *
   * ```javascript
   * // Subscribe to member enters in a space
   * space.members.subscribe('enter', (memberUpdate) => {
   *   console.log(memberUpdate);
   * });
   *
   * // Subscribe to member profile data updates in a space
   * space.members.subscribe('update', (memberUpdate) => {
   *   console.log(memberUpdate);
   * });
   *
   * // Subscribe to member leaves in a space
   * space.members.subscribe('leave', (memberUpdate) => {
   *   console.log(memberUpdate);
   * });
   *
   * // Subscribe to member removals in a space
   * space.members.subscribe('remove', (memberUpdate) => {
   *   console.log(memberUpdate);
   * });
   * ```
   * It’s also possible to subscribe to multiple event types with the same listener by using an array:
   *
   * ```javascript
   * space.members.subscribe(['enter', 'update'], (memberUpdate) => {
   *   console.log(memberUpdate);
   * });
   * ```
   * Or subscribe to all event types:
   *
   * ```javascript
   * space.members.subscribe((memberUpdate) => {
   *   console.log(memberUpdate);
   * });
   * ```
   * The following is an example payload of a member event. The `lastEvent.name` describes which {@link SpaceEventMap | event type } a payload relates to.
   *
   * ```json
   *   {
   *     "clientId": "clemons#142",
   *     "connectionId": "hd9743gjDc",
   *     "isConnected": true,
   *     "lastEvent": {
   *       "name": "enter",
   *       "timestamp": 1677595689759
   *     },
   *     "location": null,
   *     "profileData": {
   *       "username": "Claire Lemons",
   *       "avatar": "https://slides-internal.com/users/clemons.png"
   *     }
   *   }
   * ```
   * The following are the properties of a member event payload:
   *
   * | Property            | Description                                                                                                       | Type    |
   * |---------------------|-------------------------------------------------------------------------------------------------------------------|---------|
   * | clientId            | The [client identifier](https://ably.com/docs/auth/identified-clients) for the member.                                                 | String  |
   * | connectionId        | The unique identifier of the member’s [connection](https://ably.com/docs/connect).                                                     | String  |
   * | isConnected         | Whether the member is connected to Ably or not.                                                                   | Boolean |
   * | profileData         | The optional {@link Space.updateProfileData | profile data } associated with the member.                                            | Object  |
   * | location            | The current {@link Locations | location} of the member. Will be `null` for `enter`, `leave` and `remove` events. | Object  |
   * | lastEvent.name      | This documentation has been moved to {@link SpaceMember}. | String  |
   * | lastEvent.timestamp | This documentation has been moved to {@link SpaceMember}. | Number  |
   *
   * > **Further reading**
   * >
   * > Avatar stack subscription listeners only trigger on events related to members’ online status and profile updates. Each event only contains the payload of the member that triggered it. Alternatively, {@link Space.subscribe | space state } can be subscribed to which returns an array of all members with their latest state every time any event is triggered.
   *
   * <!-- END WEBSITE DOCUMENTATION -->
   *
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * Listen to member events for the space. See {@link EventEmitter} for overloaded usage.
   *
   * The argument supplied to the callback is the {@link SpaceMember} object representing the member that triggered the event.
   *
   * Example:
   *
   * ```ts
   * space.members.subscribe((member: SpaceMember) => {});
   * ```
   *
   * Available events:
   *
   * - ##### **enter**
   *
   *   Listen to enter events of members.
   *
   *   ```ts
   *   space.members.subscribe('enter', (member: SpaceMember) => {})
   *   ```
   *   The argument supplied to the callback is a {@link SpaceMember} object representing the member entering the space.
   *
   * - ##### **leave**
   *
   *   Listen to leave events of members. The leave event will be issued when a member calls `space.leave()` or is disconnected.
   *
   *   ```ts
   *   space.members.subscribe('leave', (member: SpaceMember) => {})
   *   ```
   *
   *   The argument supplied to the callback is a {@link SpaceMember} object representing the member leaving the space.
   *
   * - ##### **remove**
   *
   *   Listen to remove events of members. The remove event will be triggered when the {@link SpaceOptions.offlineTimeout | offlineTimeout } has passed.
   *
   *   ```ts
   *   space.members.subscribe('remove', (member: SpaceMember) => {})
   *   ```
   *
   *   The argument supplied to the callback is a {@link SpaceMember} object representing the member removed from the space.
   *
   * - ##### **updateProfile**
   *
   *   Listen to profile update events of members.
   *
   *   ```ts
   *   space.members.subscribe('updateProfile', (member: SpaceMember) => {})
   *   ```
   *   The argument supplied to the callback is a {@link SpaceMember} object representing the member entering the space.
   *
   * - ##### **update**
   *
   *   Listen to `enter`, `leave`, `updateProfile` and `remove` events.
   *
   *   ```ts
   *   space.members.subscribe('update', (member: SpaceMember) => {})
   *   ```
   *
   *   The argument supplied to the callback is a {@link SpaceMember} object representing the member affected by the change.
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   */
  subscribe<K extends keyof MembersEventMap>(
    eventOrEvents: K | K[],
    listener?: EventListener<MembersEventMap, K>,
  ): void;
  subscribe(listener?: EventListener<MembersEventMap, keyof MembersEventMap>): void;
  subscribe<K extends keyof MembersEventMap>(
    listenerOrEvents?: K | K[] | EventListener<MembersEventMap, K>,
    listener?: EventListener<MembersEventMap, K>,
  ) {
    try {
      super.on(listenerOrEvents, listener);
    } catch (e: unknown) {
      if (e instanceof InvalidArgumentError) {
        throw new InvalidArgumentError(
          'Members.subscribe(): Invalid arguments: ' + inspect([listenerOrEvents, listener]),
        );
      } else {
        throw e;
      }
    }
  }

  /**
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/cb5de6a6a40abdcb0d9d5af825928dd62dc1ca64/content/spaces/avatar.textile?plain=1#L107-L125) -->
   * Unsubscribe from member events to remove previously registered listeners.
   *
   * The following is an example of removing a listener for one member event type:
   *
   * ```javascript
   * space.members.unsubscribe('enter', listener);
   * ```
   * It’s also possible to remove listeners for multiple member event types:
   *
   * ```javascript
   * space.members.unsubscribe(['enter', 'leave'], listener);
   * ```
   * Or remove all listeners:
   *
   * ```javascript
   * space.members.unsubscribe();
   * ```
   * <!-- END WEBSITE DOCUMENTATION -->
   *
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * Remove all the event listeners or specific listeners. See {@link EventEmitter} for detailed usage.
   *
   * ```ts
   * // Unsubscribe from all events
   * space.members.unsubscribe();
   *
   * // Unsubscribe from enter events
   * space.members.unsubscribe('enter');
   *
   * // Unsubscribe from leave events
   * space.members.unsubscribe('leave');
   * ```
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   */
  unsubscribe<K extends keyof MembersEventMap>(
    eventOrEvents: K | K[],
    listener?: EventListener<MembersEventMap, K>,
  ): void;
  unsubscribe(listener?: EventListener<MembersEventMap, keyof MembersEventMap>): void;
  unsubscribe<K extends keyof MembersEventMap>(
    listenerOrEvents?: K | K[] | EventListener<MembersEventMap, K>,
    listener?: EventListener<MembersEventMap, K>,
  ) {
    try {
      super.off(listenerOrEvents, listener);
    } catch (e: unknown) {
      if (e instanceof InvalidArgumentError) {
        throw new InvalidArgumentError(
          'Members.unsubscribe(): Invalid arguments: ' + inspect([listenerOrEvents, listener]),
        );
      } else {
        throw e;
      }
    }
  }

  /** @internal */
  async getByConnectionId(connectionId: string): Promise<SpaceMember | null> {
    const members = await this.getAll();
    return members.find((m) => m.connectionId === connectionId) ?? null;
  }

  private createMember(message: PresenceMember): SpaceMember {
    return {
      clientId: message.clientId,
      connectionId: message.connectionId,
      isConnected: message.action !== 'leave',
      profileData: message.data.profileUpdate.current,
      location: message.data.locationUpdate.current,
      lastEvent: {
        name: message.action,
        timestamp: message.timestamp,
      },
    };
  }

  private async onMemberOffline(member: SpaceMember) {
    this.leavers.removeLeaver(member.connectionId);

    this.emit('remove', member);
    this.emit('update', member);

    if (member.location) {
      this.space.locations.emit('update', {
        previousLocation: member.location,
        currentLocation: null,
        member: { ...member, location: null },
      });
    }

    this.space.emit('update', { members: await this.getAll() });
  }
}

export default Members;
