import { Types } from 'ably';
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
  }

  private presenceUpdate = (data: PresenceMember['data']) => {
    return this.channel.presence.update(data);
  };

  private presenceEnter = (data: PresenceMember['data']) => {
    return this.channel.presence.enter(data);
  };

  private presenceLeave = (data: PresenceMember['data']) => {
    return this.channel.presence.leave(data);
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

  private onPresenceUpdate(message: PresenceMember) {
    this.members.processPresenceMessage(message);
    this.locations.processPresenceMessage(message);
    this.emit('update', { members: this.members.getAll() });
  }

  async enter(profileData: ProfileData = null): Promise<SpaceMember[]> {
    return new Promise((resolve) => {
      const presence = this.channel.presence;

      presence['subscriptions'].once('enter', async () => {
        const presenceMessages = await presence.get();
        const members = this.members.mapPresenceMembersToSpaceMembers(presenceMessages);

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
    const self = this.members.getSelf();

    if (!isObject(profileDataOrUpdateFn) && !isFunction(profileDataOrUpdateFn)) {
      throw new Error('Space.updateProfileData(): Invalid arguments: ' + inspect([profileDataOrUpdateFn]));
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

    return this.presenceUpdate(update);
  }

  leave(profileData: ProfileData = null) {
    const self = this.members.getSelf();

    if (!self) {
      throw new Error('You must enter a space before attempting to leave it');
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

    return this.presenceLeave(update);
  }

  getState(): { members: SpaceMember[] } {
    return { members: this.members.getAll() };
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
