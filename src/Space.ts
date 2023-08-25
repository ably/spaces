import Ably, { Types } from 'ably';
import { nanoid } from 'nanoid';

import EventEmitter, {
  InvalidArgumentError,
  inspect,
  type EventKey,
  type EventListener,
} from './utilities/EventEmitter.js';
import Locations from './Locations.js';
import Cursors from './Cursors.js';
import Members from './Members.js';
import Locks from './Locks.js';

import { ERR_OUT_OF_SPACE } from './Errors.js';

import { isFunction, isObject } from './utilities/is.js';

import type { SpaceOptions, SpaceMember, ProfileData } from './types.js';
import type { Subset, PresenceMember } from './utilities/types.js';

const SPACE_CHANNEL_PREFIX = '_ably_space_';

const SPACE_OPTIONS_DEFAULTS = {
  offlineTimeout: 120_000,
  cursors: {
    outboundBatchInterval: 100,
    paginationLimit: 5,
  },
};

type SpaceEventsMap = {
  update: { members: SpaceMember[] };
};

class Space extends EventEmitter<SpaceEventsMap> {
  readonly channelName: string;
  readonly connectionId: string | undefined;
  readonly options: SpaceOptions;
  readonly locations: Locations;
  readonly cursors: Cursors;
  readonly members: Members;
  readonly channel: Types.RealtimeChannelPromise;
  readonly locks: Locks;

  constructor(name: string, readonly client: Types.RealtimePromise, options?: Subset<SpaceOptions>) {
    super();

    this.options = this.setOptions(options);
    this.connectionId = this.client.connection.id;
    this.channelName = `${SPACE_CHANNEL_PREFIX}${name}`;

    this.channel = this.client.channels.get(this.channelName);
    this.onPresenceUpdate = this.onPresenceUpdate.bind(this);
    this.channel.presence.subscribe(this.onPresenceUpdate);

    this.locations = new Locations(this, this.presenceUpdate);
    this.cursors = new Cursors(this);
    this.members = new Members(this);
    this.locks = new Locks(this, this.presenceUpdate);
  }

  private presenceUpdate = (data: PresenceMember['data'], extras?: PresenceMember['extras']) => {
    if (!extras) {
      return this.channel.presence.update(data);
    }
    return this.channel.presence.update(Ably.Realtime.PresenceMessage.fromValues({ data, extras }));
  };

  private presenceEnter = (data: PresenceMember['data'], extras?: PresenceMember['extras']) => {
    if (!extras) {
      return this.channel.presence.enter(data);
    }
    return this.channel.presence.enter(Ably.Realtime.PresenceMessage.fromValues({ data, extras }));
  };

  private presenceLeave = (data: PresenceMember['data'], extras?: PresenceMember['extras']) => {
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

      this.presenceEnter({
        profileUpdate: {
          id: nanoid(),
          current: profileData,
        },
        locationUpdate: {
          id: null,
          current: null,
          previous: null,
        },
      });
    });
  }

  async updateProfileData(
    profileDataOrUpdateFn:
      | Record<string, unknown>
      | ((update: Record<string, unknown> | null) => Record<string, unknown>),
  ): Promise<void> {
    const self = await this.members.getSelf();

    if (!isObject(profileDataOrUpdateFn) && !isFunction(profileDataOrUpdateFn)) {
      throw new InvalidArgumentError(
        'Space.updateProfileData(): Invalid arguments: ' + inspect([profileDataOrUpdateFn]),
      );
    }

    const update = {
      profileUpdate: {
        id: nanoid(),
        current: isFunction(profileDataOrUpdateFn) ? profileDataOrUpdateFn(null) : profileDataOrUpdateFn,
      },
      locationUpdate: {
        id: null,
        current: self?.location ?? null,
        previous: null,
      },
    };

    if (!self) {
      await this.presenceEnter(update);
      return;
    }

    const extras = this.locks.getLockExtras(self.connectionId);
    return this.presenceUpdate(update, extras);
  }

  async leave(profileData: ProfileData = null) {
    const self = await this.members.getSelf();

    if (!self) {
      throw ERR_OUT_OF_SPACE;
    }

    const update = {
      profileUpdate: {
        id: profileData ? nanoid() : null,
        current: profileData ?? null,
      },
      locationUpdate: {
        id: null,
        current: self?.location ?? null,
        previous: null,
      },
    };

    await this.presenceLeave(update);
  }

  async getState(): Promise<{ members: SpaceMember[] }> {
    const members = await this.members.getAll();
    return { members };
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
