import { Types } from 'ably';

import SpaceOptions from './options/SpaceOptions';
import EventEmitter from './utilities/EventEmitter';
import Locations from './Locations';

// Unique prefix to avoid conflicts with channels
const SPACE_CHANNEL_PREFIX = '_ably_space_';

export type SpaceMember = {
  clientId: string;
  isConnected: boolean;
  connections: string[];
  profileData: { [key: string]: any };
  location: any | null;
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

class Space extends EventEmitter {
  private channelName: string;
  private clientId: string;
  private channel: Types.RealtimeChannelPromise;
  private members: SpaceMember[];
  private leavers: SpaceLeaver[];
  private options: SpaceOptions;

  locations: Locations;

  constructor(private name: string, private client: Types.RealtimePromise, options?: SpaceOptions) {
    super();
    this.options = { ...SPACE_OPTIONS_DEFAULTS, ...options };
    this.clientId = this.client.auth.clientId;
    this.members = [];
    this.leavers = [];
    this.locations = new Locations(this, this.channel);
    this.onPresenceUpdate = this.onPresenceUpdate.bind(this);
    this.setChannel(this.name);
  }

  private setChannel(rootName: string) {
    // Remove the old subscription if the channel is switching
    if (this.channel) {
      this.channel.presence.unsubscribe(this.onPresenceUpdate);
    }
    this.channelName = `${SPACE_CHANNEL_PREFIX}${rootName}`;
    this.channel = this.client.channels.get(this.channelName);
    this.channel.presence.subscribe(this.onPresenceUpdate);
  }

  getMemberFromConnection(connectionId: string) {
    return this.members.find((m) => m.connections.includes(connectionId));
  }

  private updateOrCreateMember(message: Types.PresenceMessage): SpaceMember {
    const member = this.getMemberFromConnection(message.connectionId);
    const lastEvent = {
      name: message.action,
      timestamp: message.timestamp,
    };

    if (!member) {
      return {
        clientId: message.clientId as string,
        isConnected: message.action !== 'leave',
        profileData: message.data.profileData,
        location: null,
        lastEvent,
        connections: [message.connectionId],
      };
    }

    if (!member.connections.includes(message.connectionId)) {
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
      this.removeMember(message.clientId);
      this.emit('membersUpdate', this.members);
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

  private onPresenceUpdate(message: Types.PresenceMessage) {
    if (!message) return;
    // By default, we only return data about other connected clients, not the whole set
    if (message.clientId === this.clientId) return;

    this.updateLeavers(message);
    this.updateMembers(message);

    this.emit('membersUpdate', this.members);
  }

  async enter(profileData?: unknown) {
    const presence = this.channel.presence;

    await presence.enter({ profileData });
    const presenceMessages = await presence.get();
    this.members = this.mapPresenceMembersToSpaceMembers(presenceMessages);

    return this.members;
  }

  leave(profileData?: unknown) {
    return this.channel.presence.leave({ profileData });
  }

  getMembers(): SpaceMember[] {
    return this.members;
  }

  getSelf(): SpaceMember | undefined {
    return this.members.find((m) => m.clientId === this.clientId);
  }
}

export default Space;
