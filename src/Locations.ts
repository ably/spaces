import { nanoid } from 'nanoid';

import EventEmitter, {
  InvalidArgumentError,
  inspect,
  type EventKey,
  type EventListener,
} from './utilities/EventEmitter.js';

import type { SpaceMember } from './types.js';
import type { PresenceMember } from './utilities/types.js';
import type Space from './Space.js';

type LocationsEventMap = {
  update: { member: SpaceMember; currentLocation: unknown; previousLocation: unknown };
};

export default class Locations extends EventEmitter<LocationsEventMap> {
  private lastLocationUpdate: Record<string, PresenceMember['data']['locationUpdate']['id']> = {};

  constructor(private space: Space, private presenceUpdate: (update: PresenceMember['data']) => Promise<void>) {
    super();
  }

  processPresenceMessage(message: PresenceMember) {
    // Only an update action is currently a valid location update.
    if (message.action !== 'update') return;

    // Emit updates only if they are different than the last held update.
    if (
      !message.data.locationUpdate.id ||
      this.lastLocationUpdate[message.connectionId] === message.data.locationUpdate.id
    ) {
      return;
    }

    const update = message.data.locationUpdate;

    const { previous } = update;
    const member = this.space.members.getByConnectionId(message.connectionId);

    if (member) {
      this.emit('update', {
        member,
        currentLocation: member.location,
        previousLocation: previous,
      });

      this.lastLocationUpdate[message.connectionId] = message.data.locationUpdate.id;
    }
  }

  set(location: unknown) {
    const self = this.space.members.getSelf();

    if (!self) {
      throw new Error('You must enter a space before setting a location.');
    }

    const update: PresenceMember['data'] = {
      profileUpdate: {
        id: null,
        current: self.profileData,
      },
      locationUpdate: {
        id: nanoid(),
        previous: self.location,
        current: location,
      },
    };

    return this.presenceUpdate(update);
  }

  subscribe<K extends EventKey<LocationsEventMap>>(
    listenerOrEvents?: K | K[] | EventListener<LocationsEventMap[K]>,
    listener?: EventListener<LocationsEventMap[K]>,
  ) {
    try {
      super.on(listenerOrEvents, listener);
    } catch (e: unknown) {
      if (e instanceof InvalidArgumentError) {
        throw new InvalidArgumentError(
          'Locations.subscribe(): Invalid arguments: ' + inspect([listenerOrEvents, listener]),
        );
      } else {
        throw e;
      }
    }
  }

  unsubscribe<K extends EventKey<LocationsEventMap>>(
    listenerOrEvents?: K | K[] | EventListener<LocationsEventMap[K]>,
    listener?: EventListener<LocationsEventMap[K]>,
  ) {
    try {
      super.off(listenerOrEvents, listener);
    } catch (e: unknown) {
      if (e instanceof InvalidArgumentError) {
        throw new InvalidArgumentError(
          'Locations.unsubscribe(): Invalid arguments: ' + inspect([listenerOrEvents, listener]),
        );
      } else {
        throw e;
      }
    }
  }

  getSelf(): unknown {
    const self = this.space.members.getSelf();
    return self ? self.location : null;
  }

  getOthers(): Record<string, unknown> {
    const self = this.space.members.getSelf();

    return this.space.members
      .getAll()
      .filter((member) => member.connectionId !== self?.connectionId)
      .reduce((acc, member) => {
        acc[member.connectionId] = member.location;
        return acc;
      }, {});
  }

  getAll(): Record<string, unknown> {
    return this.space.members.getAll().reduce((acc, member) => {
      acc[member.connectionId] = member.location;
      return acc;
    }, {});
  }
}
