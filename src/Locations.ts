import EventEmitter, { InvalidArgumentError, inspect, type EventListener } from './utilities/EventEmitter.js';

import type { SpaceMember } from './types.js';
import type { PresenceMember } from './utilities/types.js';
import type Space from './Space.js';
import { ERR_NOT_ENTERED_SPACE } from './Errors.js';
import SpaceUpdate from './SpaceUpdate.js';

export namespace LocationsEvents {
  export interface UpdateEvent {
    member: SpaceMember;
    currentLocation: unknown;
    previousLocation: unknown;
  }
}

export interface LocationsEventMap {
  update: LocationsEvents.UpdateEvent;
}

export default class Locations extends EventEmitter<LocationsEventMap> {
  private lastLocationUpdate: Record<string, PresenceMember['data']['locationUpdate']['id']> = {};

  /** @internal */
  constructor(private space: Space, private presenceUpdate: Space['presenceUpdate']) {
    super();
  }

  /** @internal */
  async processPresenceMessage(message: PresenceMember) {
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
    const member = await this.space.members.getByConnectionId(message.connectionId);

    if (member) {
      this.emit('update', {
        member,
        currentLocation: member.location,
        previousLocation: previous,
      });

      this.lastLocationUpdate[message.connectionId] = message.data.locationUpdate.id;
    }
  }

  async set(location: unknown) {
    const self = await this.space.members.getSelf();

    if (!self) {
      throw ERR_NOT_ENTERED_SPACE();
    }

    const update = new SpaceUpdate({ self, extras: this.space.locks.getLockExtras(self.connectionId) });
    await this.presenceUpdate(update.updateLocation(location));
  }

  subscribe<K extends keyof LocationsEventMap>(
    eventOrEvents: K | K[],
    listener?: EventListener<LocationsEventMap, K>,
  ): void;
  subscribe(listener?: EventListener<LocationsEventMap, keyof LocationsEventMap>): void;
  subscribe<K extends keyof LocationsEventMap>(
    listenerOrEvents?: K | K[] | EventListener<LocationsEventMap, K>,
    listener?: EventListener<LocationsEventMap, K>,
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

  unsubscribe<K extends keyof LocationsEventMap>(
    eventOrEvents: K | K[],
    listener?: EventListener<LocationsEventMap, K>,
  ): void;
  unsubscribe(listener?: EventListener<LocationsEventMap, keyof LocationsEventMap>): void;
  unsubscribe<K extends keyof LocationsEventMap>(
    listenerOrEvents?: K | K[] | EventListener<LocationsEventMap, K>,
    listener?: EventListener<LocationsEventMap, K>,
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

  async getSelf(): Promise<unknown> {
    const self = await this.space.members.getSelf();
    return self ? self.location : null;
  }

  async getOthers(): Promise<Record<string, unknown>> {
    const members = await this.space.members.getOthers();

    return members.reduce((acc: Record<string, unknown>, member: SpaceMember) => {
      acc[member.connectionId] = member.location;
      return acc;
    }, {});
  }

  async getAll(): Promise<Record<string, unknown>> {
    const members = await this.space.members.getAll();
    return members.reduce((acc: Record<string, unknown>, member: SpaceMember) => {
      acc[member.connectionId] = member.location;
      return acc;
    }, {});
  }
}
