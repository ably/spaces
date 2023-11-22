import EventEmitter, { InvalidArgumentError, inspect, type EventListener } from './utilities/EventEmitter.js';
import Leavers from './Leavers.js';

import type { SpaceMember } from './types.js';
import type { PresenceMember } from './utilities/types.js';
import type Space from './Space.js';

/**
 * The property names of `MembersEventMap` are the names of the events emitted by {@link Members}.
 */
export interface MembersEventMap {
  /**
   * A member has left the space. The member has either left explicitly by calling {@link Space.leave | `space.leave()`}, or has abruptly disconnected and not re-established a connection within 15 seconds.
   */
  leave: SpaceMember;
  /**
   * A new member has entered the space. The member has either entered explicitly by calling {@link Space.enter | `space.enter()`}, or has attempted to update their profile data before entering a space, which will instead emit an `enter` event.
   */
  enter: SpaceMember;
  /**
   * This event is emitted whenever any one of the following events is emitted:
   *
   * - {@link enter}
   * - {@link leave}
   * - {@link remove}
   * - {@link updateProfile}
   */
  update: SpaceMember;
  /**
   * A member has updated their profile data by calling {@link Space.updateProfileData | `space.updateProfileData()`}.
   */
  updateProfile: SpaceMember;
  /**
   * A member has been removed from the members list after the {@link SpaceOptions.offlineTimeout | `offlineTimeout`} period has elapsed. This enables members to appear greyed out in the avatar stack to indicate that they recently left for the period of time between their `leave` and `remove` events.
   */
  remove: SpaceMember;
}

/**
 * [Avatar stacks](https://ably.com/docs/spaces/avatar) are the most common way of showing the online status of members in an application by displaying an avatar for each member. {@link MembersEventMap | Events} are emitted whenever a member enters or leaves a space, or updates their profile data. Additional information can also be provided, such as a profile picture and email address.
 *
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
   * Retrieve the current member's own member object in a one-off call.
   *
   * The following is an example of retrieving a member's own member object:
   *
   * ```javascript
   * const myMemberInfo = await space.members.getSelf();
   * ```
   */
  async getSelf(): Promise<SpaceMember | null> {
    return this.space.connectionId ? await this.getByConnectionId(this.space.connectionId) : null;
  }

  /**
   * Retrieve the member objects of all members within the space in a one-off call.
   *
   * The following is an example of retrieving all members:
   *
   * ```javascript
   * const allMembers = await space.members.getAll();
   * ```
   */
  async getAll(): Promise<SpaceMember[]> {
    const presenceMembers = await this.space.channel.presence.get();
    const members = presenceMembers.map((m) => this.createMember(m));
    return members.concat(this.leavers.getAll().map((l) => l.member));
  }

  /**
   * Retrieve the member objects of all members within the space other than the member themselves, in a one-off call.
   *
   * The following is an example of retrieving all members other than the member themselves:
   *
   * ```javascript
   * const othersMemberInfo = await space.members.getOthers();
   * ```
   */
  async getOthers(): Promise<SpaceMember[]> {
    const members = await this.getAll();
    return members.filter((m) => m.connectionId !== this.space.connectionId);
  }

  /**
   * {@label WITH_EVENTS}
   *
   * Subscribe to members’ online status and profile updates by registering a listener. Member events are emitted whenever a member {@link Space.enter | enters} or {@link Space.leave | leaves} the space, or {@link Space.updateProfileData | updates their profile data}.
   *
   * The following is an example of subscribing to enter events:
   *
   * ```javascript
   * space.members.subscribe('enter', (memberUpdate) => {
   *   console.log(memberUpdate);
   * });
   * ```
   *
   * It’s also possible to subscribe to multiple event types with the same listener by using an array:
   *
   * ```javascript
   * space.members.subscribe(['enter', 'leave'], (memberUpdate) => {
   *   console.log(memberUpdate);
   * });
   * ```
   *
   * Or subscribe to all event types:
   *
   * ```javascript
   * space.members.subscribe('update', (memberUpdate) => {
   *   console.log(memberUpdate);
   * });
   * ```
   *
   * @param eventOrEvents An event name, or an array of event names.
   * @param listener An event listener.
   *
   * @typeParam K A type which allows one or more names of the properties of the {@link MembersEventMap} type.
   */
  subscribe<K extends keyof MembersEventMap>(
    eventOrEvents: K | K[],
    listener?: EventListener<MembersEventMap, K>,
  ): void;
  /**
   * Subscribe to members’ online status and profile updates by registering a listener for all event types.
   *
   * @param listener An event listener.
   */
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
   * {@label WITH_EVENTS}
   *
   * Unsubscribe from member events to remove previously registered listeners.
   *
   * The following is an example of removing a listener for one member event type:
   *
   * ```javascript
   * space.members.unsubscribe('enter', listener);
   * ```
   *
   * It’s also possible to remove listeners for multiple member event types:
   *
   * ```javascript
   * space.members.unsubscribe(['enter', 'leave'], listener);
   * ```
   *
   * @param eventOrEvents An event name, or an array of event names.
   * @param listener An event listener.
   *
   * @typeParam K A type which allows one or more names of the properties of the {@link MembersEventMap} type.
   */
  unsubscribe<K extends keyof MembersEventMap>(
    eventOrEvents: K | K[],
    listener?: EventListener<MembersEventMap, K>,
  ): void;
  /**
   * Unsubscribe from all events to remove previously registered listeners.
   *
   * @param listener An event listener.
   */
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
