import { Types } from 'ably';

import SpaceOptions from './options/SpaceOptions.js';
import EventEmitter from './utilities/EventEmitter.js';
import Locations from './Locations.js';
import Cursors from './Cursors';

// Unique prefix to avoid conflicts with channels
import { SPACE_CHANNEL_PREFIX } from './utilities/Constants';

export type SpaceMember = {
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
  timeoutId: NodeJS.Timeout;
};

const SPACE_OPTIONS_DEFAULTS = {
  offlineTimeout: 120_000,
};

type SpaceEventsMap = { membersUpdate: SpaceMember[]; leave: SpaceMember; enter: SpaceMember };

class Space extends EventEmitter<SpaceEventsMap> {
  private channelName: string;
  private connectionId?: string;
  private channel: Types.RealtimeChannelPromise;
  private members: SpaceMember[];
  private leavers: SpaceLeaver[];
  private options: SpaceOptions;

  readonly locations: Locations;
  readonly cursors: Cursors;

  constructor(readonly name: string, readonly client: Types.RealtimePromise, options?: SpaceOptions) {
    super();
    this.options = { ...SPACE_OPTIONS_DEFAULTS, ...options };
    if (!this.client.connection.id) {
      this.client.connection.whenState('connected').then(() => (this.connectionId = this.client.connection.id));
    } else {
      this.connectionId = this.client.connection.id;
    }
    this.members = [];
    this.leavers = [];
    this.onPresenceUpdate = this.onPresenceUpdate.bind(this);
    this.setChannel(this.name);
    this.locations = new Locations(this, this.channel);
    this.cursors = new Cursors(this);
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
    return this.members.find((m) => m.connectionId === connectionId);
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
        connectionId: message.connectionId,
        isConnected: message.action !== 'leave',
        profileData: message.data.profileData,
        location: null,
        lastEvent,
      };
    }

    member.isConnected = message.action !== 'leave';
    member.profileData = message.data?.profileData ?? member.profileData;
    member.location = member.location ? member.location : message.data?.location ?? null;
    member.lastEvent = lastEvent;

    return member;
  }

  private mapPresenceMembersToSpaceMembers(messages: Types.PresenceMessage[]) {
    return messages.map((message) => this.updateOrCreateMember(message));
  }

  private addLeaver(message: Types.PresenceMessage) {
    const timeoutCallback = () => {
      const member = this.getMemberFromConnection(message.connectionId);
      this.emit('leave', member);
      this.removeMember(message.clientId);
      this.emit('membersUpdate', this.members);
    };

    this.leavers.push({
      clientId: message.clientId,
      timeoutId: setTimeout(timeoutCallback, this.options.offlineTimeout),
    });
  }
  private removeLeaver(leaverIndex) {
    clearTimeout(this.leavers[leaverIndex].timeoutId);
    this.leavers.splice(leaverIndex, 1);
  }

  private updateLeavers(message: Types.PresenceMessage) {
    const index = this.leavers.findIndex(({ clientId }) => clientId === message.clientId);

    if (message.action === 'leave' && index < 0) {
      this.addLeaver(message);
    } else if (message.action === 'leave' && index >= 0) {
      this.removeLeaver(index);
      this.addLeaver(message);
    } else if (index >= 0) {
      this.removeLeaver(index);
    }
  }

  private updateMembers(message: Types.PresenceMessage) {
    const index = this.members.findIndex(({ clientId }) => clientId === message.clientId);
    const spaceMember = this.updateOrCreateMember(message);

    if (index >= 0) {
      this.members[index] = spaceMember;
    } else {
      this.emit('enter', spaceMember);
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
    return this.getMemberFromConnection(this.connectionId);
  }
}

export default Space;
