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
   */
  export interface UpdateEvent {
    /**
     * The member whose location changed.
     */
    member: SpaceMember;
    /**
     * <!-- MOVED FROM Locations.subscribe -->
     * The new location of the member.
     */
    currentLocation: unknown;
    /**
     * <!-- MOVED FROM Locations.subscribe -->
     * The previous location of the member.
     */
    previousLocation: unknown;
  }
}

/**
 * The property names of `LocationsEventMap` are the names of the events emitted by { @link Locations }.
 */
export interface LocationsEventMap {
  /**
   * A space member changed their location.
   */
  update: LocationsEvents.UpdateEvent;
}

/**
 * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/cb5de6a6a40abdcb0d9d5af825928dd62dc1ca64/content/spaces/locations.textile?plain=1#L9-L11) -->
 * The member location feature enables you to track where members are within a space, to see which part of your application they’re interacting with. A location could be the form field they have selected, the cell they’re currently editing in a spreadsheet, or the slide they’re viewing within a slide deck. Multiple members can be present in the same location.
 *
 * Member locations are used to visually display which component other members currently have selected, or are currently active on. Events are emitted whenever a member sets their location, such as when they click on a new cell, or slide. Events are received by members subscribed to location events and the UI component can be highlighted with the active member’s profile data to visually display their location.
 *
 * <!-- END WEBSITE DOCUMENTATION -->
 *
 * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/cb5de6a6a40abdcb0d9d5af825928dd62dc1ca64/content/spaces/locations.textile?plain=1#L211-L215) -->
 * ## Member location foundations
 *
 * The Spaces SDK is built upon existing Ably functionality available in Ably’s Core SDKs. Understanding which core features are used to provide the abstractions in the Spaces SDK enables you to manage space state and build additional functionality into your application.
 *
 * Member locations build upon the functionality of the Pub/Sub Channels [presence](https://ably.com/docs/presence-occupancy/presence) feature. Members are entered into the presence set when they {@link Space.enter | enter the space}.
 *
 * <!-- END WEBSITE DOCUMENTATION -->
 *
 * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
 * Handles the tracking of member locations within a space. Inherits from {@link EventEmitter}.
 * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
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
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/cb5de6a6a40abdcb0d9d5af825928dd62dc1ca64/content/spaces/locations.textile?plain=1#L15-L25) -->
   * Use the `set()` method to emit a location event in realtime when a member changes their location. This will be received by all location subscribers to inform them of the location change. A `location` can be any JSON-serializable object, such as a slide number or element ID.
   *
   * A member must have been { @link Space.enter | entered } into the space to set their location.
   *
   * The `set()` method is commonly combined with [`addEventListener()`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener) or a React [synthetic event](https://react.dev/learn/responding-to-events#adding-event-handlers), such as `onClick` or `onHover`.
   *
   * The following is an example of a member setting their location to a specific slide number, and element on that slide:
   *
   * ```javascript
   * await space.locations.set({ slide: '3', component: 'slide-title' });
   * ```
   * <!-- END WEBSITE DOCUMENTATION -->
   *
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * Set your current location. The `location` argument can be any JSON-serializable object. Emits a `locationUpdate` event to all connected clients in this space.
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   *
   * <!-- Second sentence copied from above -->
   * @param location The new location. Can be any JSON-serializable object, such as a slide number or element ID.
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
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/cb5de6a6a40abdcb0d9d5af825928dd62dc1ca64/content/spaces/locations.textile?plain=1#L29-L91) -->
   * Subscribe to location events by registering a listener. Location events are emitted whenever a member changes location by calling {@link set}.
   *
   * All location changes are {@link LocationsEventMap.update | `update`} events. When a location update is received, clear the highlight from the UI component of the member’s {@link LocationsEvents.UpdateEvent.previousLocation | `previousLocation`} and add it to {@link LocationsEvents.UpdateEvent.currentLocation | `currentLocation`}.
   *
   * > **Note**
   * >
   * > A location update is also emitted when a member {@link Space.leave | leaves} a space. The member’s {@link LocationsEvents.UpdateEvent.currentLocation | `currentLocation` } will be `null` for these events so that any UI component highlighting can be cleared.
   *
   * The following is an example of subscribing to location events:
   *
   * ```javascript
   * space.locations.subscribe('update', (locationUpdate) => {
   *   console.log(locationUpdate);
   * });
   * ```
   * The following is an example payload of a location event. Information about location is returned in {@link LocationsEvents.UpdateEvent.currentLocation | `currentLocation`} and {@link LocationsEvents.UpdateEvent.previousLocation | `previousLocation`}:
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
   * The following are the properties of a location event payload:
   *
   * > **Moved documentation**
   * >
   * > This documentation has been moved to { @link LocationsEvents.UpdateEvent }.
   *
   * > **Further reading**
   * >
   * > Member location subscription listeners only trigger on events related to members’ locations. Each event only contains the payload of the member that triggered it. Alternatively, {@link Space.subscribe | space state } can be subscribed to which returns an array of all members with their latest state every time any event is triggered.
   *
   * <!-- END WEBSITE DOCUMENTATION -->
   *
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * Listen to events for locations. See {@link EventEmitter} for overloaded usage.
   *
   * Available events:
   *
   * - ##### **update**
   *
   *   Fires when a member updates their location. The argument supplied to the event listener is an UpdateEvent.
   *
   *   ```ts
   *   space.locations.subscribe('update', (locationUpdate: LocationsEvents.UpdateEvent) => {});
   *   ```
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   *
   * @param eventOrEvents The event name or an array of event names.
   * @param listener The listener to add.
   *
   * @typeParam K A type which allows one or more names of the properties of the {@link LocationsEventMap} type.
   */
  subscribe<K extends keyof LocationsEventMap>(
    eventOrEvents: K | K[],
    listener?: EventListener<LocationsEventMap, K>,
  ): void;
  /**
   * Behaves the same as { @link subscribe:WITH_EVENTS | the overload which accepts one or more event names }, but subscribes to _all_ events.
   *
   * @param listener The listener to add.
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
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/cb5de6a6a40abdcb0d9d5af825928dd62dc1ca64/content/spaces/locations.textile?plain=1#L95-L107) -->
   * Unsubscribe from location events to remove previously registered listeners.
   *
   * The following is an example of removing a listener for location update events:
   *
   * ```javascript
   * space.locations.unsubscribe('update', listener);
   * ```
   * Or remove all listeners:
   *
   * ```javascript
   * space.locations.unsubscribe();
   * ```
   * <!-- END WEBSITE DOCUMENTATION -->
   *
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * Remove all event listeners, all event listeners for an event, or specific listeners. See {@link EventEmitter} for detailed usage.
   *
   * ```ts
   * space.locations.unsubscribe('update');
   * ```
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   *
   * @param eventOrEvents The event name or an array of event names.
   * @param listener The listener to remove.
   *
   * @typeParam K A type which allows one or more names of the properties of the {@link LocationsEventMap} type.
   */
  unsubscribe<K extends keyof LocationsEventMap>(
    eventOrEvents: K | K[],
    listener?: EventListener<LocationsEventMap, K>,
  ): void;
  /**
   * Behaves the same as { @link unsubscribe:WITH_EVENTS | the overload which accepts one or more event names }, but unsubscribes from _all_ events.
   *
   * @param listener The listener to remove.
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
   * <!-- This is to avoid duplication of the website documentation. -->
   * See the documentation for {@link getAll}.
   *
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * Get location for self.
   *
   * Example:
   *
   * ```ts
   * const myLocation = await space.locations.getSelf();
   * ```
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   */
  async getSelf(): Promise<unknown> {
    const self = await this.space.members.getSelf();
    return self ? self.location : null;
  }

  /**
   * <!-- This is to avoid duplication of the website documentation. -->
   * See the documentation for {@link getAll}.
   *
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * Get location for other members
   *
   * Example:
   *
   * ```ts
   * const otherLocations = await space.locations.getOthers()
   * ```
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   */
  async getOthers(): Promise<Record<string, unknown>> {
    const members = await this.space.members.getOthers();

    return members.reduce((acc: Record<string, unknown>, member: SpaceMember) => {
      acc[member.connectionId] = member.location;
      return acc;
    }, {});
  }

  /**
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/cb5de6a6a40abdcb0d9d5af825928dd62dc1ca64/content/spaces/locations.textile?plain=1#L111-L172) -->
   * Member locations can also be retrieved in one-off calls. These are local calls and retrieve the location of members retained in memory by the SDK.
   *
   * The following is an example of retrieving a member’s own location:
   *
   * ```javascript
   * const myLocation = await space.locations.getSelf();
   * ```
   * The following is an example payload returned by `space.locations.getSelf()`. It will return the properties of the member’s `location`:
   *
   * ```json
   * {
   *   "slide": "3",
   *   "component": "slide-title"
   * }
   * ```
   * The following is an example of retrieving the location objects of all members other than the member themselves.
   *
   * ```javascript
   * const othersLocations = await space.locations.getOthers();
   * ```
   * The following is an example payload returned by `space.locations.getOthers()`: It will return the properties of all member’s `location` by their `connectionId`:
   *
   * ```json
   * {
   *   "xG6H3lnrCn": {
   *       "slide": "1",
   *       "component": "textBox-1"
   *   },
   *   "el29SVLktW": {
   *       "slide": "1",
   *       "component": "image-2"
   *   }
   * }
   * ```
   * The following is an example of retrieving the location objects of all members, including the member themselves:
   *
   * ```javascript
   * const allLocations = await space.locations.getAll();
   * ```
   * The following is an example payload returned by `space.locations.getAll()`. It will return the properties of all member’s `location` by their `connectionId`:
   *
   * ```json
   * {
   *   "xG6H3lnrCn": {
   *       "slide": "1",
   *       "component": "textBox-1"
   *   },
   *   "el29SVLktW": {
   *       "slide": "1",
   *       "component": "image-2"
   *   },
   *   "dieF3291kT": {
   *       "slide": "3",
   *       "component": "slide-title"
   *   }
   * }
   * ```
   * <!-- END WEBSITE DOCUMENTATION -->
   *
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * Get location for all members.
   *
   * Example:
   *
   * ```ts
   * const allLocations = await space.locations.getAll();
   * ```
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   */
  async getAll(): Promise<Record<string, unknown>> {
    const members = await this.space.members.getAll();
    return members.reduce((acc: Record<string, unknown>, member: SpaceMember) => {
      acc[member.connectionId] = member.location;
      return acc;
    }, {});
  }
}
