import { Types } from 'ably';

import SpaceOptions from './options/SpaceOptions.js';
import EventEmitter from './utilities/EventEmitter.js';
import Locations from './Locations.js';
import Cursors from './Cursors.js';

// Unique prefix to avoid conflicts with channels
import { LOCATION_UPDATE, MEMBERS_UPDATE, SPACE_CHANNEL_PREFIX } from './utilities/Constants.js';
import { isFunction } from './utilities/TypeOf.js';

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
  connectionId: string;
  timeoutId: ReturnType<typeof setTimeout>;
};

const SPACE_OPTIONS_DEFAULTS = {
  offlineTimeout: 120_000,
};

type SpaceEventsMap = { membersUpdate: SpaceMember[]; leave: SpaceMember; enter: SpaceMember; update: SpaceMember };

class Space extends EventEmitter<SpaceEventsMap> {
  private channelName: string;
  private connectionId: string | undefined;
  private channel: Types.RealtimeChannelPromise;
  private members: SpaceMember[];
  private leavers: SpaceLeaver[];
  private options: SpaceOptions;

  readonly locations: Locations;
  readonly cursors: Cursors;

  constructor(readonly name: string, readonly client: Types.RealtimePromise, options?: SpaceOptions) {
    super();
    this.options = { ...SPACE_OPTIONS_DEFAULTS, ...options };
    this.connectionId = this.client.connection.id;
    this.members = [];
    this.leavers = [];
    this.onPresenceUpdate = this.onPresenceUpdate.bind(this);
    this.setChannel(this.name);
    this.locations = new Locations(this, this.channel);
    this.cursors = new Cursors(this, options?.cursors);
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

  getChannelName() {
    return this.channelName;
  }

  getMemberFromConnection(connectionId: string): SpaceMember | undefined {
    return this.members.find((m) => m.connectionId === connectionId);
  }

  getMemberIndexFromConnection(connectionId: string): number {
    return this.members.findIndex((m) => m.connectionId === connectionId);
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

  private mapPresenceMembersToSpaceMembers(messages: Types.PresenceMessage[]) {
    return messages.map((message) => this.updateOrCreateMember(message));
  }

  private addLeaver(message: Types.PresenceMessage) {
    const timeoutCallback = () => {
      const member = this.getMemberFromConnection(message.connectionId);

      this.emit('leave', member);
      this.removeMember(message.connectionId);
      this.emit(MEMBERS_UPDATE, this.members);

      if (member?.location) {
        this.locations.emit(LOCATION_UPDATE, {
          previousLocation: member.location,
          currentLocation: null,
          member: { ...member, location: null },
        });
      }
    };

    this.leavers.push({
      clientId: message.clientId,
      connectionId: message.connectionId,
      timeoutId: setTimeout(timeoutCallback, this.options.offlineTimeout),
    });
  }

  private removeLeaver(leaverIndex: number): void {
    clearTimeout(this.leavers[leaverIndex].timeoutId);
    this.leavers.splice(leaverIndex, 1);
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

  private removeMember(connectionId: string): void {
    const index = this.getMemberIndexFromConnection(connectionId);

    if (index >= 0) {
      this.members.splice(index, 1);
    }
  }

  private onPresenceUpdate(message: Types.PresenceMessage) {
    if (!message) return;

    this.updateLeavers(message);
    this.updateMembers(message);

    this.emit(MEMBERS_UPDATE, this.members);
  }

  async enter(profileData?: unknown): Promise<SpaceMember[]> {
    return new Promise((resolve) => {
      const presence = this.channel.presence;
      presence.enter({ profileData });

      presence['subscriptions'].once('enter', async () => {
        const presenceMessages = await presence.get();
        this.members = this.mapPresenceMembersToSpaceMembers(presenceMessages);

        resolve(this.members);
      });
    });
  }

  async updateProfileData(profileDataOrUpdateFn: unknown | ((unknown) => unknown)): Promise<void> {
    const self = this.getSelf();

    if (isFunction(profileDataOrUpdateFn) && !self) {
      const update = profileDataOrUpdateFn();
      await this.enter(update);
      return;
    } else if (!self) {
      await this.enter(profileDataOrUpdateFn);
      return;
    } else if (isFunction(profileDataOrUpdateFn) && self) {
      const update = profileDataOrUpdateFn(self.profileData);
      await this.channel.presence.update({ profileData: update });
      return;
    }

    await this.channel.presence.update({ profileData: profileDataOrUpdateFn });
    return;
  }

  leave(profileData?: unknown) {
    return this.channel.presence.leave({ profileData });
  }

  getMembers(): SpaceMember[] {
    return this.members;
  }

  getSelf(): SpaceMember | undefined {
    if (this.connectionId) {
      return this.getMemberFromConnection(this.connectionId);
    }

    return;
  }
}

export default Space;
