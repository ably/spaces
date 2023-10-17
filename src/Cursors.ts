import { Types } from 'ably';

import Space from './Space.js';
import CursorBatching from './CursorBatching.js';
import CursorDispensing from './CursorDispensing.js';
import EventEmitter, { InvalidArgumentError, inspect, type EventListener } from './utilities/EventEmitter.js';
import CursorHistory from './CursorHistory.js';
import { CURSOR_UPDATE } from './CursorConstants.js';

import type { CursorsOptions, CursorUpdate } from './types.js';
import type { RealtimeMessage } from './utilities/types.js';
import { ERR_NOT_ENTERED_SPACE } from './Errors.js';

/**
 * The property names of `CursorsEventMap` are the names of the events emitted by { @link Cursors }.
 */
export interface CursorsEventMap {
  /**
   * A space member moved their cursor.
   */
  update: CursorUpdate;
}

const CURSORS_CHANNEL_TAG = '::$cursors';

/**
 * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/cb5de6a6a40abdcb0d9d5af825928dd62dc1ca64/content/spaces/cursors.textile?plain=1#L9-L17) -->
 * The live cursors feature enables you to track the cursors of members within a space in realtime.
 *
 * Cursor events are emitted whenever a member moves their mouse within a space. In order to optimize the efficiency and frequency of updates, cursor position events are automatically batched. The batching interval may be customized in order to further optimize for increased performance versus the number of events published.
 *
 * Live cursor updates are not available as part of the {@link Space.subscribe | space state} and must be subscribed to using {@link Cursors.subscribe | `space.cursors.subscribe()`}.
 *
 * > **Important**
 * >
 * > Live cursors are a great way of providing contextual awareness as to what members are looking at within an application. However, too many cursors moving across a page can often be a distraction rather than an enhancement. As such, Ably recommends a maximum of 20 members simultaneously streaming their cursors in a space at any one time for an optimal end-user experience.
 *
 * <!-- END WEBSITE DOCUMENTATION -->
 *
 * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/cb5de6a6a40abdcb0d9d5af825928dd62dc1ca64/content/spaces/cursors.textile?plain=1#L254-L262) -->
 * ## Live cursor foundations
 *
 * The Spaces SDK is built upon existing Ably functionality available in Ably’s Core SDKs. Understanding which core features are used to provide the abstractions in the Spaces SDK enables you to manage space state and build additional functionality into your application.
 *
 * Live cursors build upon the functionality of the Pub/Sub Channels [presence](https://ably.com/docs/presence-occupancy/presence) feature.
 *
 * Due to the high frequency at which updates are streamed for cursor movements, live cursors utilizes its own [channel](https://ably.com/docs/channels). The other features of the Spaces SDK, such as avatar stacks, member locations and component locking all share a single channel. For this same reason, cursor position updates are not included in the {@link Space.subscribe | space state } and may only be subscribed to via the {@link Space.cursors | `cursors` } property.
 *
 * The channel is only created when a member calls `space.cursors.set()`. The live cursors channel object can be accessed through `space.cursors.channel`. To monitor the [underlying state of the cursors channel](https://ably.com/docs/channels#states), the channel object can be accessed through `space.cursors.channel`.
 *
 * <!-- END WEBSITE DOCUMENTATION -->
 *
 * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
 * Handles tracking of member cursors within a space. Inherits from {@link EventEmitter}.
 * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
 */
export default class Cursors extends EventEmitter<CursorsEventMap> {
  private readonly cursorBatching: CursorBatching;
  private readonly cursorDispensing: CursorDispensing;
  private readonly cursorHistory: CursorHistory;
  /**
   * The {@link SpaceOptions.cursors | cursors options} passed to {@link default.get | `Spaces.get()`}, with default values filled in.
   */
  readonly options: CursorsOptions;
  private readonly channelName: string;

  /**
   * The [ably-js](https://github.com/ably/ably-js) realtime channel instance that this `Cursors` instance uses for transmitting and receiving data.
   */
  public channel?: Types.RealtimeChannelPromise;

  /** @internal */
  constructor(private space: Space) {
    super();

    this.options = this.space.options.cursors;
    this.channelName = `${this.space.name}${CURSORS_CHANNEL_TAG}`;

    this.cursorHistory = new CursorHistory();
    this.cursorBatching = new CursorBatching(this.options.outboundBatchInterval);

    const emitCursorUpdate = (update: CursorUpdate): void => this.emit('update', update);
    this.cursorDispensing = new CursorDispensing(emitCursorUpdate);
  }

  /**
   * Schedules a cursor update event to be sent that will cause the following events to fire
   *
   * @return {void}
   *
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/cb5de6a6a40abdcb0d9d5af825928dd62dc1ca64/content/spaces/cursors.textile?plain=1#L21-L74) -->
   * Set the position of a member’s cursor using the `set()` method. A position must contain an X-axis value and a Y-axis value to set the cursor position on a 2D plane. Calling `set()` will emit a cursor event so that other members are informed of the cursor movement in realtime.
   *
   * A member must have been { @link Space.enter | entered } into the space to set their cursor position.
   *
   * The `set()` method takes the following parameters:
   *
   * | Parameter  | Description                                                                                                         | Type   |
   * |------------|---------------------------------------------------------------------------------------------------------------------|--------|
   * | position.x | The position of the member’s cursor on the X-axis.                                                                  | Number |
   * | position.y | The position of the member’s cursor on the Y-axis.                                                                  | Number |
   * | data       | An optional arbitrary JSON-serializable object containing additional information about the cursor, such as a color. | Object |
   *
   * > **Note**
   * >
   * > The `data` parameter can be used to stream additional information related to a cursor’s movement, such as:
   * >
   * > - The color that other member’s should display a cursor as.
   * > - The ID of an element that a user may be dragging for drag and drop functionality.
   * > - Details of any cursor annotations.
   * >
   * > Be aware that as live cursor updates are batched it is not advisable to publish data unrelated to cursor position in the `data` parameter. Use a [pub/sub channel](https://ably.com/docs/channels) instead.
   *
   * The following is an example of a member setting their cursor position by adding an event listener to obtain their cursor coordinates and then publishing their position using the `set()` method:
   *
   * ```javascript
   * window.addEventListener('mousemove', ({ clientX, clientY }) => {
   *   space.cursors.set({ position: { x: clientX, y: clientY }, data: { color: 'red' } });
   * });
   * ```
   * The following is an example payload of a cursor event. Cursor events are uniquely identifiable by the `connectionId` of a cursor.
   *
   * ```json
   * {
   *   "hd9743gjDc": {
   *     "connectionId": "hd9743gjDc",
   *     "clientId": "clemons#142",
   *     "position": {
   *       "x": 864,
   *       "y": 32
   *     },
   *     "data": {
   *       "color": "red"
   *     }
   *   }
   * }
   * ```
   * The following are the properties of a cursor event payload:
   *
   * > **Moved documentation**
   * >
   * > This documentation has been moved to {@link CursorUpdate} and {@link CursorPosition}.
   *
   * <!-- END WEBSITE DOCUMENTATION -->
   *
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * Set the position of a cursor. If a member has not yet entered the space, this method will error.
   *
   * A event payload returned contains an object with 2 properties. `position` is an object with 2 required properties, `x` and `y`. These represent the position of the cursor on a 2D plane. A second optional property, `data` can also be passed. This is an object of any shape and is meant for data associated with the cursor movement (like drag or hover calculation results):
   *
   * Example usage:
   *
   * ```ts
   * window.addEventListener('mousemove', ({ clientX, clientY }) => {
   *   space.cursors.set({ position: { x: clientX, y: clientY }, data: { color: "red" } });
   * });
   * ```
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   *
   * @param cursor An object describing the cursor update that should be emitted.
   */
  async set(cursor: Pick<CursorUpdate, 'position' | 'data'>) {
    const self = await this.space.members.getSelf();

    if (!self) {
      throw ERR_NOT_ENTERED_SPACE();
    }

    const channel = this.getChannel();
    this.cursorBatching.pushCursorPosition(channel, cursor);
  }

  private getChannel(): Types.RealtimeChannelPromise {
    return this.channel ?? (this.channel = this.initializeCursorsChannel());
  }

  private initializeCursorsChannel(): Types.RealtimeChannelPromise {
    const channel = this.space.client.channels.get(this.channelName);
    channel.presence.subscribe(this.onPresenceUpdate.bind(this));
    channel.presence.enter();
    return channel;
  }

  private async onPresenceUpdate() {
    const channel = this.getChannel();
    const cursorsMembers = await channel.presence.get();
    this.cursorBatching.setShouldSend(cursorsMembers.length > 1);
    this.cursorBatching.setBatchTime(cursorsMembers.length * this.options.outboundBatchInterval);
  }

  private isUnsubscribed() {
    const channel = this.getChannel();

    interface ChannelWithSubscriptions extends Types.RealtimeChannelPromise {
      subscriptions: EventEmitter<{}>;
    }

    const subscriptions = (channel as ChannelWithSubscriptions).subscriptions;
    return !this.emitterHasListeners(subscriptions);
  }

  private emitterHasListeners = <T>(emitter: EventEmitter<T>) => {
    const flattenEvents = (obj: Record<string, Function[]>) =>
      Object.entries(obj)
        .map((_, v) => v)
        .flat();

    return (
      emitter.any.length > 0 ||
      emitter.anyOnce.length > 0 ||
      flattenEvents(emitter.events).length > 0 ||
      flattenEvents(emitter.eventsOnce).length > 0
    );
  };

  /**
   * {@label WITH_EVENTS}
   *
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/cb5de6a6a40abdcb0d9d5af825928dd62dc1ca64/content/spaces/cursors.textile?plain=1#L78-L90) -->
   * Subscribe to cursor events by registering a listener. Cursor events are emitted whenever a member moves their cursor by calling `set()`. Use the `subscribe()` method on the `cursors` object of a space to receive updates.
   *
   * > **Note**
   * >
   * > The rate at which cursor events are published is controlled by the `outboundBatchInterval` property set in the {@link CursorsOptions | cursor options } of a space.
   *
   * The following is an example of subscribing to cursor events:
   *
   * ```javascript
   * space.cursors.subscribe('update', (cursorUpdate) => {
   *   console.log(cursorUpdate);
   * });
   * ```
   * <!-- END WEBSITE DOCUMENTATION -->
   *
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * Listen to `CursorUpdate` events. See {@link EventEmitter} for overloaded usage.
   *
   * Available events:
   *
   * - ##### **update**
   *
   *   Emits an event when a new cursor position is set. The argument supplied to the event listener is a {@link CursorUpdate}.
   *
   *   ```ts
   *   space.cursors.subscribe('update', (cursorUpdate: CursorUpdate) => {});
   *   ```
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   *
   * @param eventOrEvents The event name or an array of event names.
   * @param listener The listener to add.
   *
   * @typeParam K A type which allows one or more names of the properties of the {@link CursorsEventMap} type.
   */
  subscribe<K extends keyof CursorsEventMap>(
    eventOrEvents: K | K[],
    listener?: EventListener<CursorsEventMap, K>,
  ): void;
  /**
   * Behaves the same as { @link subscribe:WITH_EVENTS | the overload which accepts one or more event names }, but subscribes to _all_ events.
   *
   * @param listener The listener to add.
   */
  subscribe(listener?: EventListener<CursorsEventMap, keyof CursorsEventMap>): void;
  subscribe<K extends keyof CursorsEventMap>(
    listenerOrEvents?: K | K[] | EventListener<CursorsEventMap, K>,
    listener?: EventListener<CursorsEventMap, K>,
  ) {
    try {
      super.on(listenerOrEvents, listener);
    } catch (e: unknown) {
      if (e instanceof InvalidArgumentError) {
        throw new InvalidArgumentError(
          'Cursors.subscribe(): Invalid arguments: ' + inspect([listenerOrEvents, listener]),
        );
      } else {
        throw e;
      }
    }

    if (this.isUnsubscribed()) {
      const channel = this.getChannel();

      channel.subscribe(CURSOR_UPDATE, (message) => {
        this.cursorDispensing.processBatch(message as RealtimeMessage);
      });
    }
  }

  /**
   * {@label WITH_EVENTS}
   *
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/cb5de6a6a40abdcb0d9d5af825928dd62dc1ca64/content/spaces/cursors.textile?plain=1#L94-L106) -->
   * Unsubscribe from cursor events to remove previously registered listeners.
   *
   * The following is an example of removing a listener for cursor update events:
   *
   * ```javascript
   * space.cursors.unsubscribe(`update`, listener);
   * ```
   * Or remove all listeners:
   *
   * ```javascript
   * space.cursors.unsubscribe();
   * ```
   * <!-- END WEBSITE DOCUMENTATION -->
   *
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * Remove all event listeners, all event listeners for an event, or specific listeners. See {@link EventEmitter} for detailed usage.
   *
   * ```ts
   * space.cursors.unsubscribe('update');
   * ```
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   *
   * @param eventOrEvents The event name or an array of event names.
   * @param listener The listener to remove.
   *
   * @typeParam K A type which allows one or more names of the properties of the {@link CursorsEventMap} type.
   */
  unsubscribe<K extends keyof CursorsEventMap>(
    eventOrEvents: K | K[],
    listener?: EventListener<CursorsEventMap, K>,
  ): void;
  /**
   * Behaves the same as { @link unsubscribe:WITH_EVENTS | the overload which accepts one or more event names }, but subscribes to _all_ events.
   *
   * @param listener The listener to remove.
   */
  unsubscribe(listener?: EventListener<CursorsEventMap, keyof CursorsEventMap>): void;
  unsubscribe<K extends keyof CursorsEventMap>(
    listenerOrEvents?: K | K[] | EventListener<CursorsEventMap, K>,
    listener?: EventListener<CursorsEventMap, K>,
  ) {
    try {
      super.off(listenerOrEvents, listener);
    } catch (e: unknown) {
      if (e instanceof InvalidArgumentError) {
        throw new InvalidArgumentError(
          'Cursors.unsubscribe(): Invalid arguments: ' + inspect([listenerOrEvents, listener]),
        );
      } else {
        throw e;
      }
    }

    const hasListeners = this.emitterHasListeners(this);

    if (!hasListeners) {
      const channel = this.getChannel();
      channel.unsubscribe();
    }
  }

  /**
   * <!-- This is to avoid duplication of the website documentation. -->
   * See the documentation for {@link getAll}.
   *
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * Get the last `CursorUpdate` object for self.
   *
   * Example:
   *
   * ```ts
   * const selfPosition = await space.cursors.getSelf();
   * ```
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   */
  async getSelf(): Promise<CursorUpdate | null> {
    const self = await this.space.members.getSelf();
    if (!self) return null;

    const allCursors = await this.getAll();
    return allCursors[self.connectionId];
  }

  /**
   * <!-- This is to avoid duplication of the website documentation. -->
   * See the documentation for {@link getAll}.
   *
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * Get the last `CursorUpdate` object for everyone else but yourself.
   *
   * Example:
   *
   * ```ts
   * const otherPositions = await space.cursors.getOthers();
   * ```
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   */
  async getOthers(): Promise<Record<string, null | CursorUpdate>> {
    const self = await this.space.members.getSelf();
    if (!self) return {};

    const allCursors = await this.getAll();
    const allCursorsFiltered = allCursors;
    delete allCursorsFiltered[self.connectionId];
    return allCursorsFiltered;
  }

  /**
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/cb5de6a6a40abdcb0d9d5af825928dd62dc1ca64/content/spaces/cursors.textile?plain=1#L126-L211) -->
   * Cursor positions can be retrieved in one-off calls. These are local calls that retrieve the latest position of cursors retained in memory by the SDK.
   *
   * The following is an example of retrieving a member’s own cursor position:
   *
   * ```javascript
   * const myCursor = await space.cursors.getSelf();
   * ```
   * The following is an example payload returned by `space.cursors.getSelf()`:
   *
   * ```json
   * {
   *   “clientId”: “DzOBJqgGXzyUBb816Oa6i”,
   *   “connectionId”: “__UJBKZchX”,
   *   "position": {
   *     "x": 864,
   *     "y": 32
   *   }
   * }
   * ```
   * The following is an example of retrieving the cursor positions for all members other than the member themselves:
   *
   * ```javascript
   * const othersCursors = await space.cursors.getOthers();
   * ```
   * The following is an example payload returned by `space.cursors.getOthers()`:
   *
   * ```json
   * {
   *   "3ej3q7yZZz": {
   *       "clientId": "yyXidHatpP3hJpMpXZi8W",
   *       "connectionId": "3ej3q7yZZz",
   *       "position": {
   *         "x": 12,
   *         "y": 3
   *       }
   *   },
   *   "Z7CA3-1vlR": {
   *       "clientId": "b18mj5B5hm-govdFEYRyb",
   *       "connectionId": "Z7CA3-1vlR",
   *       "position": {
   *         "x": 502,
   *         "y": 43
   *       }
   *   }
   * }
   * ```
   * The following is an example of retrieving the cursor positions for all members, including the member themselves. `getAll()` is useful for retrieving the initial position of members’ cursors.
   *
   * ```javascript
   * const allCursors = await space.cursors.getAll();
   * ```
   * The following is an example payload returned by `space.cursors.getAll()`:
   *
   * ```json
   * {
   *   "3ej3q7yZZz": {
   *       "clientId": "yyXidHatpP3hJpMpXZi8W",
   *       "connectionId": "3ej3q7yZZz",
   *       "position": {
   *         "x": 12,
   *         "y": 3
   *       }
   *   },
   *   "Z7CA3-1vlR": {
   *       "clientId": "b18mj5B5hm-govdFEYRyb",
   *       "connectionId": "Z7CA3-1vlR",
   *       "position": {
   *         "x": 502,
   *         "y": 43
   *       }
   *   },
   *   "__UJBKZchX": {
   *       “clientId”: “DzOBJqgGXzyUBb816Oa6i”,
   *       “connectionId”: “__UJBKZchX”,
   *       "position": {
   *         "x": 864,
   *         "y": 32
   *       }
   *   }
   * }
   * ```
   * <!-- END WEBSITE DOCUMENTATION -->
   *
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * Get the last `CursorUpdate` object for all the members.
   *
   * Example:
   *
   * ```ts
   * const allLatestPositions = await space.cursors.getAll();
   * ```
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   */
  async getAll(): Promise<Record<string, null | CursorUpdate>> {
    const channel = this.getChannel();
    return await this.cursorHistory.getLastCursorUpdate(channel, this.options.paginationLimit);
  }
}
