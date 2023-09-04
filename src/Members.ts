import EventEmitter, {
  InvalidArgumentError,
  inspect,
  type EventKey,
  type EventListener,
} from './utilities/EventEmitter.js';
import Leavers from './Leavers.js';

import type { SpaceMember } from './types.js';
import type { PresenceMember } from './utilities/types.js';
import type Space from './Space.js';

type MemberEventsMap = {
  leave: SpaceMember;
  enter: SpaceMember;
  update: SpaceMember;
  updateProfile: SpaceMember;
  remove: SpaceMember;
};

class Members extends EventEmitter<MemberEventsMap> {
  private lastMemberUpdate: Record<string, PresenceMember['data']['profileUpdate']['id']> = {};
  private leavers: Leavers;

  constructor(private space: Space) {
    super();
    this.leavers = new Leavers(this.space.options.offlineTimeout);
  }

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

  async getSelf(): Promise<SpaceMember | null> {
    return this.space.connectionId ? await this.getByConnectionId(this.space.connectionId) : null;
  }

  async getAll(): Promise<SpaceMember[]> {
    const presenceMembers = await this.space.channel.presence.get();
    const members = presenceMembers.map((m) => this.createMember(m));
    return members.concat(this.leavers.getAll().map((l) => l.member));
  }

  async getOthers(): Promise<SpaceMember[]> {
    const members = await this.getAll();
    return members.filter((m) => m.connectionId !== this.space.connectionId);
  }

  subscribe<K extends EventKey<MemberEventsMap>>(
    listenerOrEvents?: K | K[] | EventListener<MemberEventsMap[K]>,
    listener?: EventListener<MemberEventsMap[K]>,
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

  unsubscribe<K extends EventKey<MemberEventsMap>>(
    listenerOrEvents?: K | K[] | EventListener<MemberEventsMap[K]>,
    listener?: EventListener<MemberEventsMap[K]>,
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

  async getByConnectionId(connectionId: string): Promise<SpaceMember | null> {
    const members = await this.getAll();
    return members.find((m) => m.connectionId === connectionId) ?? null;
  }

  createMember(message: PresenceMember): SpaceMember {
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

  async onMemberOffline(member: SpaceMember) {
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
