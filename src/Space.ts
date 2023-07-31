import { Types } from 'ably';

import EventEmitter, {
  InvalidArgumentError,
  inspect,
  type EventKey,
  type EventListener,
  type EventMap,
} from './utilities/EventEmitter.js';
import Locations from './Locations.js';
import Cursors from './Cursors.js';
import Members from './Members.js';

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

export type SpaceOptions = {
  offlineTimeout: number;
  cursors: {
    outboundBatchInterval: number;
    paginationLimit: number;
  };
};

const SPACE_OPTIONS_DEFAULTS = {
  offlineTimeout: 120_000,
  cursors: {
    outboundBatchInterval: 100,
    paginationLimit: 5,
  },
};

// Like Partial, but support a nested object
export type Subset<K> = {
  [attr in keyof K]?: K[attr] extends object ? Subset<K[attr]> : K[attr];
};

type SpaceEventsMap = {
  membersUpdate: [SpaceMember[]];
  leave: [SpaceMember];
  enter: [SpaceMember];
  update: [SpaceMember];
};

interface Provider<ProviderEventMap extends EventMap> {
  subscribe<K extends EventKey<ProviderEventMap>>(
    listenerOrEvents?: K | K[] | EventListener<ProviderEventMap[K]>,
    listener?: EventListener<ProviderEventMap[K]>,
  );

  unsubscribe<K extends EventKey<ProviderEventMap>>(
    listenerOrEvents?: K | K[] | EventListener<ProviderEventMap[K]>,
    listener?: EventListener<ProviderEventMap[K]>,
  );
}

interface ICursors {
  set: Cursors['set'];
  subscribe: Cursors['subscribe'];
  unsubscribe: Cursors['unsubscribe'];
  getAll: Cursors['getAll'];
}

class Space extends EventEmitter<SpaceEventsMap> implements Provider<SpaceEventsMap> {
  private channelName: string;
  private connectionId: string | undefined;
  private channel: Types.RealtimeChannelPromise;

  private leavers: SpaceLeaver[];
  private options: SpaceOptions;

  private _cursors: Cursors;

  readonly locations: Locations;
  readonly members: Members;
  readonly cursors: ICursors;

  constructor(readonly name: string, readonly client: Types.RealtimePromise, options?: Subset<SpaceOptions>) {
    super();

    this.options = this.setOptions(options);
    this.connectionId = this.client.connection.id;

    this.onPresenceUpdate = this.onPresenceUpdate.bind(this);
    this.setChannel(this.name);

    this.members = new Members(this.connectionId, this.channel, this.options.offlineTimeout);
    this.locations = new Locations(this, this.channel);

    this._cursors = new Cursors(this, options?.cursors);

    this.cursors = {
      set: this._cursors.set,
      subscribe: this._cursors.subscribe,
      unsubscribe: this._cursors.unsubscribe,
      getAll: this._cursors.getAll,
    };
  }

  private setOptions(options?: Subset<SpaceOptions>): SpaceOptions {
    const {
      offlineTimeout,
      cursors: { outboundBatchInterval, paginationLimit },
    } = SPACE_OPTIONS_DEFAULTS;

    return {
      offlineTimeout: options?.offlineTimeout ?? offlineTimeout,
      cursors: {
        outboundBatchInterval: options?.cursors?.outboundBatchInterval ?? outboundBatchInterval,
        paginationLimit: options?.cursors?.paginationLimit ?? paginationLimit,
      },
    };
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

    this.members.updateLeavers(message);
    this.members.updateMembers(message);

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

  subscribe<K extends EventKey<SpaceEventsMap>>(
    listenerOrEvents?: K | K[] | EventListener<SpaceEventsMap[K]>,
    listener?: EventListener<SpaceEventsMap[K]>,
  ) {
    try {
      super.on(listenerOrEvents, listener);
    } catch (e: unknown) {
      if (e instanceof InvalidArgumentError) {
        throw new InvalidArgumentError(
          'Space.subscribe(): Invalid arguments: ' + inspect([listenerOrEvents, listener]),
        );
      } else {
        throw e;
      }
    }
  }

  unsubscribe<K extends EventKey<SpaceEventsMap>>(
    listenerOrEvents?: K | K[] | EventListener<SpaceEventsMap[K]>,
    listener?: EventListener<SpaceEventsMap[K]>,
  ) {
    try {
      super.off(listenerOrEvents, listener);
    } catch (e: unknown) {
      if (e instanceof InvalidArgumentError) {
        throw new InvalidArgumentError(
          'Space.unsubscribe(): Invalid arguments: ' + inspect([listenerOrEvents, listener]),
        );
      } else {
        throw e;
      }
    }
  }
}

export default Space;
