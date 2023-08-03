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
    this.leavers = new Leavers(this.space);
  }

  processPresenceMessage(message: PresenceMember) {
    const { action, connectionId } = message;
    const isLeaver = !!this.leavers.getByConnectionId(connectionId);
    const isMember = !!this.getByConnectionId(connectionId);
    const memberUpdate = this.createMember(message);

    if (action === 'leave' && !isLeaver) {
      this.leavers.addLeaver(connectionId);
      this.emit('leave', memberUpdate);
    } else if (action === 'leave' && isLeaver) {
      this.leavers.refreshTimeout(connectionId);
      this.emit('leave', memberUpdate);
    } else if (isLeaver) {
      this.leavers.removeLeaver(connectionId);
    }

    if (!isMember) {
      this.members.push(memberUpdate);
      this.emit('enter', memberUpdate);
    } else if (['enter', 'update', 'leave'].includes(action) && isMember) {
      const index = this.members.findIndex((m) => m.connectionId === connectionId);
      this.members[index] = memberUpdate;
    }

    // Emit profileData updates only if they are different then the last held update.
    // A locationUpdate is handled in Locations.
    if (message.data.profileUpdate.id && this.lastMemberUpdate[connectionId] !== message.data.profileUpdate.id) {
      this.lastMemberUpdate[message.connectionId] = message.data.locationUpdate.id;
      this.emit('update', memberUpdate);
    }
  }

  getSelf(): SpaceMember | undefined {
    return this.space.connectionId ? this.getByConnectionId(this.space.connectionId) : undefined;
  }

  getAll(): SpaceMember[] {
    return this.members;
  }

  getOthers(): SpaceMember[] {
    return this.members.filter((m) => m.connectionId !== this.space.connectionId);
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

  getByConnectionId(connectionId: string): SpaceMember | undefined {
    return this.members.find((m) => m.connectionId === connectionId);
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

  removeMember(connectionId: string): void {
    const index = this.members.findIndex((m) => m.connectionId === connectionId);

    if (index >= 0) {
      const member = this.members.splice(index, 1)[0];

      this.emit('remove', member);

      if (member.location) {
        this.space.locations.emit('update', {
          previousLocation: member.location,
          currentLocation: null,
          member: { ...member, location: null },
        });
      }

      this.space.emit('update', { members: this.getAll() });
    }
  }
}

export default Members;
