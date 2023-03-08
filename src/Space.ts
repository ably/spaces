import { Types } from 'ably';

import SpaceOptions from './options/SpaceOptions';

// Unique prefix to avoid conflicts with channels
const SPACE_CHANNEL_PREFIX = '_ably_space_';

type SpaceEvents = 'membersUpdate';

export type SpaceMember = {
  clientId: string;
  isConnected: boolean;
  connections: string[];
  profileData: { [key: string]: any };
  lastEvent: {
    name: Types.PresenceAction;
    timestamp: number;
  };
};

type SpaceLeaver = {
  clientId: string;
  timeoutId: NodeJS.Timeout;
};

const SPACE_OPTIONS_DEFAULTS = {
  offlineTimeout: 120_000,
};

class SpaceMembersUpdateEvent extends Event {
  constructor(public message?: Types.PresenceMessage, public markForRemoval?: boolean) {
    super('membersUpdate', {});
    this.markForRemoval = typeof markForRemoval !== 'boolean' ? false : markForRemoval;
  }
}

class Space extends EventTarget {
  private channelName: string;
  private clientId: string;
  private channel: Types.RealtimeChannelPromise;
  private members: SpaceMember[];
  private leavers: SpaceLeaver[];
  private options: SpaceOptions;

  eventTarget: EventTarget;

  constructor(private name: string, private client: Types.RealtimePromise, options?: SpaceOptions) {
    super();
    this.options = { ...SPACE_OPTIONS_DEFAULTS, ...options };
    this.clientId = this.client.auth.clientId;
    this.members = [];
    this.leavers = [];
    this.setChannel(this.name);
  }

  private setChannel(rootName: string) {
    this.channelName = `${SPACE_CHANNEL_PREFIX}${rootName}`;
    this.channel = this.client.channels.get(this.channelName);
  }

  getMemberFromConnection(connectionId: string){
    return this.members.find((m) => m.connections.includes(connectionId));
  }
  

  private updateOrCreateMember(message: Types.PresenceMessage): SpaceMember {
    const member = this.getMemberFromConnection(message.connectionId);
    const lastEvent = {
      name: message.action,
      timestamp: message.timestamp,
    };

    if(!member){
      return {
        clientId: message.clientId as string,
        isConnected: message.action !== 'leave',
        profileData: message.data,
        lastEvent,
        connections: [message.connectionId]
      };
    }

    if(!member.connections.includes(message.connectionId)){
      member.connections.push(message.connectionId);
    }

    member.isConnected = message.action !== 'leave';
    member.profileData = message.data ?? member.profileData;
    member.lastEvent = lastEvent;

    return member;
  }

  private mapPresenceMembersToSpaceMembers(messages: Types.PresenceMessage[]) {
    return messages
      .filter((message) => message.clientId !== this.clientId)
      .map((message) => this.updateOrCreateMember(message));
  }

  private addLeaver(message: Types.PresenceMessage) {
    const timeoutCallback = () => {
      this.dispatchEvent(new SpaceMembersUpdateEvent(message, true));
    };

    this.leavers.push({
      clientId: message.clientId,
      timeoutId: setTimeout(timeoutCallback, this.options.offlineTimeout),
    });
  }

  private removeLeaver(leaverIndex) {
    this.leavers.splice(leaverIndex, 1);
  }

  private resetLeaver(leaverIndex) {
    clearTimeout(this.leavers[leaverIndex].timeoutId);
  }

  private updateLeavers(message: Types.PresenceMessage) {
    const index = this.leavers.findIndex(({ clientId }) => clientId === message.clientId);

    if (message.action === 'leave' && index < 0) {
      this.addLeaver(message);
    } else if (message.action === 'leave' && index >= 0) {
      this.resetLeaver(index);
      this.removeLeaver(index);
      this.addLeaver(message);
    } else if (index >= 0) {
      this.resetLeaver(index);
      this.removeLeaver(index);
    }
  }

  private updateMembers(message: Types.PresenceMessage) {
    const index = this.members.findIndex(({ clientId }) => clientId === message.clientId);
    const spaceMember = this.updateOrCreateMember(message);

    if (index >= 0) {
      this.members[index] = spaceMember;
    } else {
      this.members.push(spaceMember);
    }
  }

  private removeMember(clientId) {
    const index = this.members.findIndex((member) => member.clientId === clientId);

    if (index >= 0) {
      this.members.splice(index, 1);
    }
  }

  private subscribeToPresence() {
    this.channel.presence.subscribe((message) => {
      this.dispatchEvent(new SpaceMembersUpdateEvent(message));
    });
  }

  async enter(profileData?: unknown) {
    const presence = this.channel.presence;

    await presence.enter(profileData);
    const presenceMessages = await presence.get();
    this.members = this.mapPresenceMembersToSpaceMembers(presenceMessages);

    return this.members;
  }

  leave(data?: unknown) {
    return this.channel.presence.leave(data);
  }

  on(spaceEvent: SpaceEvents, callback) {
    if (spaceEvent === 'membersUpdate') {
      this.subscribeToPresence();
      this.addEventListener('membersUpdate', (event: SpaceMembersUpdateEvent) => {
        if (!event.message) return;
        // By default, we only return data about other connected clients, not the whole set
        if (event.message.clientId === this.clientId) return;

        if (event.markForRemoval) {
          this.removeMember(event.message.clientId);
        } else {
          this.updateLeavers(event.message);
          this.updateMembers(event.message);
        }

        callback(this.members);
      });
    } else {
      // TODO: align with ably-js error policy here
      throw new Error(`Event "${spaceEvent}" is unsupported`);
    }
  }
}

export { SpaceMembersUpdateEvent };
export default Space;
