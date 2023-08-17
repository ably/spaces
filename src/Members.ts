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
  remove: SpaceMember;
};

class Members extends EventEmitter<MemberEventsMap> {
  private lastMemberUpdate: Record<string, PresenceMember['data']['profileUpdate']['id']> = {};
  private leavers: Leavers;

  members: SpaceMember[] = [];

  constructor(private space: Space) {
    super();
    this.leavers = new Leavers(this.space.options.offlineTimeout);
  }

  async processPresenceMessage(message: PresenceMember) {
    const { action, connectionId } = message;
    const isLeaver = !!this.leavers.getByConnectionId(connectionId);
    const isMember = this.members.some((m) => m.connectionId === connectionId);
    const memberUpdate = this.createMember(message);

    if (action === 'leave') {
      this.leavers.addLeaver(memberUpdate, () => this.onMemberOffline(memberUpdate));
      this.emit('leave', memberUpdate);
    } else if (isLeaver) {
      this.leavers.removeLeaver(connectionId);
    }

    if (!isMember && action !== 'leave') {
      this.members.push(memberUpdate);
      this.emit('enter', memberUpdate);
    } else if (['enter', 'update'].includes(action) && isMember) {
      const index = this.members.findIndex((m) => m.connectionId === connectionId);
      this.members[index] = memberUpdate;
    } else if (action === 'leave' && isMember) {
      const index = this.members.findIndex((m) => m.connectionId === connectionId);
      this.members.splice(index, 1);
    }

    // Emit profileData updates only if they are different then the last held update.
    // A locationUpdate is handled in Locations.
    if (message.data.profileUpdate.id && this.lastMemberUpdate[connectionId] !== message.data.profileUpdate.id) {
      this.lastMemberUpdate[message.connectionId] = message.data.profileUpdate.id;
      this.emit('update', memberUpdate);
    }
  }

  async getSelf(): Promise<SpaceMember | undefined> {
    return this.space.connectionId ? await this.getByConnectionId(this.space.connectionId) : undefined;
  }

  async getAll(): Promise<SpaceMember[]> {
    return this.members.concat(this.leavers.getAll().map((l) => l.member));
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

  mapPresenceMembersToSpaceMembers(messages: PresenceMember[]) {
    const members = messages.map((message) => this.createMember(message));
    this.members = [...members];
    return members;
  }

  async getByConnectionId(connectionId: string): Promise<SpaceMember | undefined> {
    const members = await this.getAll();
    return members.find((m) => m.connectionId === connectionId);
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
