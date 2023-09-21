import Ably, { Types } from 'ably';

import EventEmitter, { InvalidArgumentError, inspect, type EventListener } from './utilities/EventEmitter.js';
import Locations from './Locations.js';
import Cursors from './Cursors.js';
import Members from './Members.js';
import Locks from './Locks.js';
import SpaceUpdate, { type SpacePresenceData } from './SpaceUpdate.js';

import { ERR_NOT_ENTERED_SPACE } from './Errors.js';
import { isFunction, isObject } from './utilities/is.js';

import type { SpaceOptions, SpaceMember, ProfileData } from './types.js';
import type { Subset, PresenceMember } from './utilities/types.js';

// Replace by ::$space when that channel tag will be available
const SPACE_CHANNEL_TAG = '-space';

const SPACE_OPTIONS_DEFAULTS = {
  offlineTimeout: 120_000,
  cursors: {
    outboundBatchInterval: 25,
    paginationLimit: 5,
  },
};

export namespace SpaceEvents {
  export interface UpdateEvent {
    members: SpaceMember[];
  }
}

export interface SpaceEventMap {
  update: SpaceEvents.UpdateEvent;
}

class Space extends EventEmitter<SpaceEventMap> {
  private readonly channelName: string;
  readonly connectionId: string | undefined;
  readonly options: SpaceOptions;
  readonly locations: Locations;
  readonly cursors: Cursors;
  readonly members: Members;
  readonly channel: Types.RealtimeChannelPromise;
  readonly locks: Locks;
  readonly name: string;

  /** @internal */
  constructor(name: string, readonly client: Types.RealtimePromise, options?: Subset<SpaceOptions>) {
    super();

    this.options = this.setOptions(options);
    this.connectionId = this.client.connection.id;
    this.name = name;
    this.channelName = `${name}${SPACE_CHANNEL_TAG}`;

    this.channel = this.client.channels.get(this.channelName);
    this.onPresenceUpdate = this.onPresenceUpdate.bind(this);
    this.channel.presence.subscribe(this.onPresenceUpdate);

    this.locations = new Locations(this, this.presenceUpdate);
    this.cursors = new Cursors(this);
    this.members = new Members(this);
    this.locks = new Locks(this, this.presenceUpdate);
  }

  private presenceUpdate = ({ data, extras }: SpacePresenceData) => {
    if (!extras) {
      return this.channel.presence.update(data);
    }
    return this.channel.presence.update(Ably.Realtime.PresenceMessage.fromValues({ data, extras }));
  };

  private presenceEnter = ({ data, extras }: SpacePresenceData) => {
    if (!extras) {
      return this.channel.presence.enter(data);
    }
    return this.channel.presence.enter(Ably.Realtime.PresenceMessage.fromValues({ data, extras }));
  };

  private presenceLeave = ({ data, extras }: SpacePresenceData) => {
    if (!extras) {
      return this.channel.presence.leave(data);
    }
    return this.channel.presence.leave(Ably.Realtime.PresenceMessage.fromValues({ data, extras }));
  };

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

  private async onPresenceUpdate(message: PresenceMember) {
    await this.members.processPresenceMessage(message);
    await this.locations.processPresenceMessage(message);
    await this.locks.processPresenceMessage(message);
    this.emit('update', { members: await this.members.getAll() });
  }

  async enter(profileData: ProfileData = null): Promise<SpaceMember[]> {
    return new Promise((resolve) => {
      const presence = this.channel.presence;

      interface PresenceWithSubscriptions extends Types.RealtimePresencePromise {
        subscriptions: EventEmitter<{ enter: [unknown] }>;
      }

      (presence as PresenceWithSubscriptions).subscriptions.once('enter', async () => {
        const presenceMessages = await presence.get();

        presenceMessages.forEach((msg) => this.locks.processPresenceMessage(msg));

        const members = await this.members.getAll();
        resolve(members);
      });

      const update = new SpaceUpdate({ self: null, extras: null });
      this.presenceEnter(update.updateProfileData(profileData));
    });
  }

  async updateProfileData(profileDataOrUpdateFn: ProfileData | ((update: ProfileData) => ProfileData)): Promise<void> {
    const self = await this.members.getSelf();

    if (!isObject(profileDataOrUpdateFn) && !isFunction(profileDataOrUpdateFn)) {
      throw new InvalidArgumentError(
        'Space.updateProfileData(): Invalid arguments: ' + inspect([profileDataOrUpdateFn]),
      );
    }

    let update = new SpaceUpdate({ self, extras: self ? this.locks.getLockExtras(self.connectionId) : null });

    if (!self) {
      const data = update.updateProfileData(
        isFunction(profileDataOrUpdateFn) ? profileDataOrUpdateFn(null) : profileDataOrUpdateFn,
      );
      await this.presenceEnter(data);
      return;
    } else {
      const data = update.updateProfileData(
        isFunction(profileDataOrUpdateFn) ? profileDataOrUpdateFn(self.profileData) : profileDataOrUpdateFn,
      );
      return this.presenceUpdate(data);
    }
  }

  async leave(profileData: ProfileData = null) {
    const self = await this.members.getSelf();

    if (!self) {
      throw ERR_NOT_ENTERED_SPACE();
    }

    const update = new SpaceUpdate({ self, extras: this.locks.getLockExtras(self.connectionId) });
    let data;

    // Use arguments so it's possible to deliberately nullify profileData on leave
    if (arguments.length > 0) {
      data = update.updateProfileData(profileData);
    } else {
      data = update.noop();
    }

    await this.presenceLeave(data);
  }

  async getState(): Promise<{ members: SpaceMember[] }> {
    const members = await this.members.getAll();
    return { members };
  }

  subscribe<K extends keyof SpaceEventMap>(
    listenerOrEvents?: K | K[] | EventListener<SpaceEventMap[K]>,
    listener?: EventListener<SpaceEventMap[K]>,
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

  unsubscribe<K extends keyof SpaceEventMap>(
    listenerOrEvents?: K | K[] | EventListener<SpaceEventMap[K]>,
    listener?: EventListener<SpaceEventMap[K]>,
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
