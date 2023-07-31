import { Types } from 'ably';

import Space, { SpaceMember } from './Space.js';
import EventEmitter, {
  InvalidArgumentError,
  inspect,
  type EventKey,
  type EventListener,
} from './utilities/EventEmitter.js';

type LocationEventMap = {
  locationUpdate: [{ member: SpaceMember; previousLocation: unknown; currentLocation: unknown }];
};

export default class Locations extends EventEmitter<LocationEventMap> {
  constructor(public space: Space, private channel: Types.RealtimeChannelPromise) {
    super();
    this.channel.presence.subscribe(this.onPresenceUpdate.bind(this));
  }

  private onPresenceUpdate(message: Types.PresenceMessage) {
    if (!['update', 'leave'].includes(message.action)) return;

    const member = this.space.getMemberFromConnection(message.connectionId);

    if (member) {
      const { previousLocation, currentLocation } = message.data;
      member.location = currentLocation;
      this.emit('locationUpdate', { member: { ...member }, currentLocation, previousLocation });
    }
  }

  set(location: unknown) {
    const self = this.space.getSelf();
    if (!self) {
      throw new Error('Must enter a space before setting a location');
    }

    return this.channel.presence.update({
      profileData: self.profileData,
      previousLocation: self.location,
      currentLocation: location,
    });
  }

  subscribe<K extends EventKey<LocationEventMap>>(
    listenerOrEvents?: K | K[] | EventListener<LocationEventMap[K]>,
    listener?: EventListener<LocationEventMap[K]>,
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

  unsubscribe<K extends EventKey<LocationEventMap>>(
    listenerOrEvents?: K | K[] | EventListener<LocationEventMap[K]>,
    listener?: EventListener<LocationEventMap[K]>,
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

  getSelf(): Location | undefined {
    const self = this.space.getSelf();
    return self ? self.location : undefined;
  }

  getOthers(): Record<string, Location> {
    const self = this.space.getSelf();

    return this.space
      .getMembers()
      .filter((member) => member.connectionId !== self?.connectionId)
      .reduce((acc, member) => {
        acc[member.connectionId] = member.location;
        return acc;
      }, {});
  }

  getAll(): Record<string, Location> {
    return this.space.getMembers().reduce((acc, member) => {
      acc[member.connectionId] = member.location;
      return acc;
    }, {});
  }
}
