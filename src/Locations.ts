import EventEmitter, { InvalidArgumentError, inspect, type EventListener } from './utilities/EventEmitter.js';

import type { SpaceMember } from './types.js';
import type { PresenceMember } from './utilities/types.js';
import type Space from './Space.js';
import { ERR_NOT_ENTERED_SPACE } from './Errors.js';
import SpaceUpdate from './SpaceUpdate.js';

/**
 * This namespace contains the types which represent the data attached to an event emitted by a {@link Locations | `Locations`} instance.
 */
export namespace LocationsEvents {
  /**
   * The data attached to an {@link LocationsEventMap.update | `update`} event.
   *
   * The following is an example payload of a location event:
   *
   * ```json
   * {
   *   "member": {
   *     "clientId": "clemons#142",
   *     "connectionId": "hd9743gjDc",
   *     "isConnected": true,
   *     "profileData": {
   *       "username": "Claire Lemons",
   *       "avatar": "https://slides-internal.com/users/clemons.png"
   *     },
   *     "location": {
   *       "slide": "3",
   *       "component": "slide-title"
   *     },
   *     "lastEvent": {
   *       "name": "update",
   *       "timestamp": 1972395669758
   *     }
   *   },
   *   "previousLocation": {
   *     "slide": "2",
   *     "component": null
   *   },
   *   "currentLocation": {
   *     "slide": "3",
   *     "component": "slide-title"
   *   }
   * }
   * ```
   */
  export interface UpdateEvent {
    /**
     * The member whose location changed.
     */
    member: SpaceMember;
    /**
     * The new location of the member.
     */
    currentLocation: unknown;
    /**
     * The previous location of the member.
     */
    previousLocation: unknown;
  }
}

/**
 * The property names of `LocationsEventMap` are the names of the events emitted by {@link Locations}.
 */
export interface LocationsEventMap {
  /**
   * A space member changed their location.
   */
  update: LocationsEvents.UpdateEvent;
}

/**
 * [Member locations](https://ably.com/docs/spaces/locations) enable you to track where members are within a {@link Space | space}, to see which part of your application they’re interacting with. A location could be the form field they have selected, the cell they’re currently editing in a spreadsheet, or the slide they’re viewing within a slide deck. Multiple members can be present in the same location.
 *
 * Location events are emitted whenever a member changes their location, such as by clicking on a new cell or slide. This enables UI components to be highlighted with the active member's profile data to visually display their location.
 *
 */
export default class Locations extends EventEmitter<LocationsEventMap> {
  private lastLocationUpdate: Record<string, PresenceMember['data']['locationUpdate']['id']> = {};

  /** @internal */
  constructor(
    private space: Space,
    private presenceUpdate: Space['presenceUpdate'],
  ) {
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

  /**
   * Set the location of a member an emit an {@link LocationsEvents.UpdateEvent | `update`} event.
   *
   * A `location` can be any JSON-serializable object, such as a slide number or element ID.
   *
   * A member must have been {@link Space.enter | entered} into the space to set their location.
   *
   * The following is an example of a member setting their location to a specific slide number, and element on that slide:
   *
   * ```javascript
   * await space.locations.set({ slide: '3', component: 'slide-title' });
   * ```
   *
   * @param location The member's new location. Can be any JSON-serializable object.
   */
  async set(location: unknown) {
    const self = await this.space.members.getSelf();

    if (!self) {
      throw ERR_NOT_ENTERED_SPACE();
    }

    const update = new SpaceUpdate({ self, extras: this.space.locks.getLockExtras(self.connectionId) });
    await this.presenceUpdate(update.updateLocation(location));
  }

  /**
   * {@label WITH_EVENTS}
   *
   * Subscribe to location events by registering a listener. Location events are emitted whenever a member {@link Locations.set | changes} their location.
   *
   * All location changes are `update` events. When a location update is received, clear the highlight from the UI component of the member’s {@link LocationsEvents.UpdateEvent.previousLocation | `previousLocation`} and add it to {@link LocationsEvents.UpdateEvent.currentLocation | `currentLocation`}.
   *
   * > **Note**
   * >
   * > A location update is also emitted when a member is {@link MembersEventMap.remove | removed} from a space. The member’s {@link LocationsEvents.UpdateEvent.currentLocation | `currentLocation` } will be `null` for these events so that any UI component highlighting can be cleared. Member location subscription listeners only trigger on events related to members’ locations. Each event only contains the payload of the member that triggered it. Alternatively, {@link Space.subscribe | space state } can be subscribed to which returns an array of all members with their latest state every time any event is triggered.
   *
   * The following is an example of subscribing to location events:
   *
   * ```javascript
   * space.locations.subscribe('update', (locationUpdate) => {
   *   console.log(locationUpdate);
   * });
   * ```
   *
   * @param eventOrEvents An event name, or an array of event names.
   * @param listener An event listener.
   *
   * @typeParam K A type which allows one or more names of the properties of the {@link LocationsEventMap} type.
   */
  subscribe<K extends keyof LocationsEventMap>(
    eventOrEvents: K | K[],
    listener?: EventListener<LocationsEventMap, K>,
  ): void;
  /**
   * Subscribe to location updates by registering a listener for all events.
   *
   * @param listener An event listener.
   */
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

  /**
   * {@label WITH_EVENTS}
   *
   * Unsubscribe from location events to remove previously registered listeners.
   *
   * The following is an example of removing a listener for location update events:
   *
   * ```javascript
   * space.locations.unsubscribe('update', listener);
   * ```
   *
   * @param eventOrEvents An event name, or an array of event names.
   * @param listener An event listener.
   *
   * @typeParam K A type which allows one or more names of the properties of the {@link LocationsEventMap} type.
   */
  unsubscribe<K extends keyof LocationsEventMap>(
    eventOrEvents: K | K[],
    listener?: EventListener<LocationsEventMap, K>,
  ): void;
  /**
   * Unsubscribe from all events to remove previously registered listeners.
   *
   * The following is an example of removing a listener for all events:
   *
   * ```javascript
   * space.locations.unsubscribe(listener);
   * ```
   *
   * @param listener An event listener.
   */
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

  /**
   * Retrieve the location of the current member in a one-off call.
   *
   * The following is an example of retrieving a member's own location:
   *
   * ```javascript
   * const myLocation = await space.locations.getSelf();
   * ```
   */
  async getSelf(): Promise<unknown> {
    const self = await this.space.members.getSelf();
    return self ? self.location : null;
  }

  /**
   * Retrieve the locations of all members other than the member themselves in a one-off call.
   *
   * The following is an example of retrieving the locations of all members, except the member themselves:
   *
   * ```javascript
   * const otherLocations = await space.locations.getOthers()
   * ```
   */
  async getOthers(): Promise<Record<string, unknown>> {
    const members = await this.space.members.getOthers();

    return members.reduce((acc: Record<string, unknown>, member: SpaceMember) => {
      acc[member.connectionId] = member.location;
      return acc;
    }, {});
  }

  /**
   * Retrieve the location of all members in a one-off call.
   *
   * The following is an example of retrieving the locations of all members:
   *
   * ```javascript
   * const allLocations = await space.locations.getAll();
   * ```
   */
  async getAll(): Promise<Record<string, unknown>> {
    const members = await this.space.members.getAll();
    return members.reduce((acc: Record<string, unknown>, member: SpaceMember) => {
      acc[member.connectionId] = member.location;
      return acc;
    }, {});
  }
}
