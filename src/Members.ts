import { Types } from 'ably';

import EventEmitter, {
  InvalidArgumentError,
  inspect,
  type EventKey,
  type EventListener,
} from './utilities/EventEmitter.js';

type SpaceMember = {
  clientId: string;
  connectionId: string;
  isConnected: boolean;
  profileData: { [key: string]: any };
  location: any;
  lastEvent: {
    name: Types.PresenceAction;
    timestamp: number;
  };
};

type SpaceLeaver = {
  clientId: string;
  connectionId: string;
  timeoutId: ReturnType<typeof setTimeout>;
};

type MemberEventsMap = { leave: SpaceMember; enter: SpaceMember; update: SpaceMember };

class Members extends EventEmitter<MemberEventsMap> {
  private leavers: SpaceLeaver[];
  private members: SpaceMember[];

  constructor(
    private connectionId: string | undefined,
    private channel: Types.RealtimeChannelPromise,
    private offlineTimeout: number,
  ) {
    super();
    this.channel.presence.subscribe(this.onPresenceUpdate.bind(this));

    this.members = [];
    this.leavers = [];
  }

  private onPresenceUpdate(message: Types.PresenceMessage) {
    this.updateLeavers(message);
    this.updateMembers(message);
  }

  private updateLeavers(message: Types.PresenceMessage): void {
    const index = this.leavers.findIndex(({ connectionId }) => message.connectionId === connectionId);

    if (message.action === 'leave' && index < 0) {
      this.addLeaver(message);
    } else if (message.action === 'leave' && index >= 0) {
      this.removeLeaver(index);
      this.addLeaver(message);
    } else if (index >= 0) {
      this.removeLeaver(index);
    }
  }

  private addLeaver(message: Types.PresenceMessage) {
    const timeoutCallback = () => {
      const member = this.getMemberFromConnection(message.connectionId);

      this.emit('leave', member);
      this.removeMember(message.connectionId);

      // Move this Location
      //   if (member?.location) {
      //     this.locations.emit(LOCATION_UPDATE, {
      //       previousLocation: member.location,
      //       currentLocation: null,
      //       member: { ...member, location: null },
      //     });
      //   }
    };

    this.leavers.push({
      clientId: message.clientId,
      connectionId: message.connectionId,
      timeoutId: setTimeout(timeoutCallback, this.offlineTimeout),
    });
  }

  private removeLeaver(leaverIndex: number): void {
    clearTimeout(this.leavers[leaverIndex].timeoutId);
    this.leavers.splice(leaverIndex, 1);
  }

  private removeMember(connectionId: string): void {
    const index = this.getMemberIndexFromConnection(connectionId);

    if (index >= 0) {
      this.members.splice(index, 1);
    }
  }

  private updateMembers(message: Types.PresenceMessage): void {
    const index = this.getMemberIndexFromConnection(message.connectionId);
    const spaceMember = this.updateOrCreateMember(message);

    if (index >= 0) {
      this.emit('update', spaceMember);
      this.members[index] = spaceMember;
    } else {
      this.emit('enter', spaceMember);
      this.members.push(spaceMember);
    }
  }

  private updateOrCreateMember(message: Types.PresenceMessage): SpaceMember {
    const member = this.getMemberFromConnection(message.connectionId);
    const lastEvent = {
      name: message.action,
      timestamp: message.timestamp,
    };

    if (!member) {
      return {
        clientId: message.clientId,
        connectionId: message.connectionId,
        isConnected: message.action !== 'leave',
        profileData: message.data.profileData,
        location: message?.data?.currentLocation || null,
        lastEvent,
      };
    }

    member.isConnected = message.action !== 'leave';
    member.lastEvent = lastEvent;
    member.profileData = message.data?.profileData ?? member.profileData;

    return member;
  }

  getMemberIndexFromConnection(connectionId: string): number {
    return this.members.findIndex((m) => m.connectionId === connectionId);
  }

  getMemberFromConnection(connectionId: string): SpaceMember | undefined {
    return this.members.find((m) => m.connectionId === connectionId);
  }

  getSelf(): SpaceMember | undefined {
    return this.connectionId ? this.getMemberFromConnection(this.connectionId) : undefined;
  }

  getAll(): SpaceMember[] {
    return this.members;
  }

  getOthers(): SpaceMember[] {
    return this.members.filter((m) => m.connectionId !== this.connectionId);
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
}

export default Members;
