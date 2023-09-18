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

export interface CursorsEventMap {
  update: CursorUpdate;
}

const CURSORS_CHANNEL_TAG = '::$cursors';

/**
 * > **Documentation source**
 * >
 * > The following documentation is copied from the [Spaces documentation website](https://ably.com/docs/spaces).
 * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/5f9e999399ebf284c0eeecff52a9d1e4d36ce8a8/content/spaces/cursors.textile?plain=1#L9-L17) -->
 * The live cursors feature enables you to track the cursors of members within a space in realtime.
 *
 * Cursor events are emitted whenever a member moves their mouse within a space. In order to optimize the efficiency and frequency of updates, cursor position events are automatically batched. The batching interval may be customized in order to further optimize for increased performance versus the number of events published.
 *
 * Live cursor updates are not available as part of the "space state":/spaces/space#subscribe and must be subscribed to using "@space.cursors.subscribe()@":#subscribe.
 *
 * <aside data-type='important'>
 * <p>Live cursors are a great way of providing contextual awareness as to what members are looking at within an application. However, too many cursors moving across a page can often be a distraction rather than an enhancement. As such, Ably recommends a maximum of 20 members simultaneously streaming their cursors in a space at any one time for an optimal end-user experience.</p>
 * </aside>
 * <!-- END WEBSITE DOCUMENTATION -->
 *
 * > **Documentation source**
 * >
 * > The following documentation is copied from the [Spaces documentation website](https://ably.com/docs/spaces).
 * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/5f9e999399ebf284c0eeecff52a9d1e4d36ce8a8/content/spaces/cursors.textile?plain=1#L254-L262) -->
 * h2(#foundations). Live cursor foundations
 *
 * The Spaces SDK is built upon existing Ably functionality available in Ably's Core SDKs. Understanding which core features are used to provide the abstractions in the Spaces SDK enables you to manage space state and build additional functionality into your application.
 *
 * Live cursors build upon the functionality of the Pub/Sub Channels "presence":/presence-occupancy/presence feature.
 *
 * Due to the high frequency at which updates are streamed for cursor movements, live cursors utilizes its own "channel":/channels. The other features of the Spaces SDK, such as avatar stacks, member locations and component locking all share a single channel. For this same reason, cursor position updates are not included in the "space state":/spaces/space and may only be subscribed to on the @cursors@ namespace.
 *
 * The channel is only created when a member calls @space.cursors.set()@. The live cursors channel object can be accessed through @space.cursors.channel@. To monitor the "underlying state of the cursors channel":/channels#states, the channel object can be accessed through @space.cursors.channel@.
 * <!-- END WEBSITE DOCUMENTATION -->
 */
export default class Cursors extends EventEmitter<CursorsEventMap> {
  private readonly cursorBatching: CursorBatching;
  private readonly cursorDispensing: CursorDispensing;
  private readonly cursorHistory: CursorHistory;
  readonly options: CursorsOptions;
  readonly channelName: string;

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
   * @param {CursorUpdate} cursor
   * @return {void}
   *
   * > **Documentation source**
   * >
   * > The following documentation is copied from the [Spaces documentation website](https://ably.com/docs/spaces).
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/5f9e999399ebf284c0eeecff52a9d1e4d36ce8a8/content/spaces/cursors.textile?plain=1#L21-L74) -->
   * Set the position of a member's cursor using the @set()@ method. A position must contain an X-axis value and a Y-axis value to set the cursor position on a 2D plane. Calling @set()@ will emit a cursor event so that other members are informed of the cursor movement in realtime.
   *
   * A member must have been "entered":/spaces/space#enter into the space to set their cursor position.
   *
   * The @set()@ method takes the following parameters:
   *
   * |_. Parameter |_. Description |_. Type |
   * | position.x | The position of the member's cursor on the X-axis. | Number |
   * | position.y | The position of the member's cursor on the Y-axis. | Number |
   * | data | An optional arbitrary JSON-serializable object containing additional information about the cursor, such as a color. | Object |
   *
   * <aside data-type='note'>
   * <p>The @data@ parameter can be used to stream additional information related to a cursor's movement, such as:</p>
   * <ul><li>The color that other member's should display a cursor as.</li>
   * <li>The ID of an element that a user may be dragging for drag and drop functionality.</li>
   * <li>Details of any cursor annotations.</li></ul>
   * <p>Be aware that as live cursor updates are batched it is not advisable to publish data unrelated to cursor position in the @data@ parameter. Use a "pub/sub channel":/channels instead.</p>
   * </aside>
   *
   * The following is an example of a member setting their cursor position by adding an event listener to obtain their cursor coordinates and then publishing their position using the @set()@ method:
   *
   * ```[javascript]
   * window.addEventListener('mousemove', ({ clientX, clientY }) => {
   *   space.cursors.set({ position: { x: clientX, y: clientY }, data: { color: 'red' } });
   * });
   * ```
   *
   * The following is an example payload of a cursor event. Cursor events are uniquely identifiable by the @connectionId@ of a cursor.
   *
   * ```[json]
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
   *
   * The following are the properties of a cursor event payload:
   *
   * |_. Property |_. Description |_. Type |
   * | connectionId | The unique identifier of the member's "connection":/connect. | String |
   * | clientId | The "client identifier":/auth/identified-clients for the member. | String |
   * | position | An object containing the position of a member's cursor. | Object |
   * | position.x | The position of the member's cursor on the X-axis. | Number |
   * | position.y | The position of the member's cursor on the Y-axis. | Number |
   * | data | An optional arbitrary JSON-serializable object containing additional information about the cursor. | Object |
   * <!-- END WEBSITE DOCUMENTATION -->
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
   * > **Documentation source**
   * >
   * > The following documentation is copied from the [Spaces documentation website](https://ably.com/docs/spaces).
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/5f9e999399ebf284c0eeecff52a9d1e4d36ce8a8/content/spaces/cursors.textile?plain=1#L78-L90) -->
   * Subscribe to cursor events by registering a listener. Cursor events are emitted whenever a member moves their cursor by calling @set()@. Use the @subscribe()@ method on the @cursors@ object of a space to receive updates.
   *
   * <aside data-type='note'>
   * <p>The rate at which cursor events are published is controlled by the @outboundBatchInterval@ property set in the "cursor options":#options of a space.</p>
   * </aside>
   *
   * The following is an example of subscribing to cursor events:
   *
   * ```[javascript]
   * space.cursors.subscribe('update', (cursorUpdate) => {
   *   console.log(cursorUpdate);
   * });
   * ```
   * <!-- END WEBSITE DOCUMENTATION -->
   */
  subscribe<K extends keyof CursorsEventMap>(
    eventOrEvents: K | K[],
    listener?: EventListener<CursorsEventMap, K>,
  ): void;
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
   * > **Documentation source**
   * >
   * > The following documentation is copied from the [Spaces documentation website](https://ably.com/docs/spaces).
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/5f9e999399ebf284c0eeecff52a9d1e4d36ce8a8/content/spaces/cursors.textile?plain=1#L94-L106) -->
   * Unsubscribe from cursor events to remove previously registered listeners.
   *
   * The following is an example of removing a listener for cursor update events:
   *
   * ```[javascript]
   * space.cursors.unsubscribe(`update`, listener);
   * ```
   *
   * Or remove all listeners:
   *
   * ```[javascript]
   * space.cursors.unsubscribe();
   * ```
   * <!-- END WEBSITE DOCUMENTATION -->
   */
  unsubscribe<K extends keyof CursorsEventMap>(
    eventOrEvents: K | K[],
    listener?: EventListener<CursorsEventMap, K>,
  ): void;
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
   * > **Documentation source**
   * >
   * > The following documentation is copied from the [Spaces documentation website](https://ably.com/docs/spaces).
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/5f9e999399ebf284c0eeecff52a9d1e4d36ce8a8/content/spaces/cursors.textile?plain=1#L126-L211) -->
   * Cursor positions can be retrieved in one-off calls. These are local calls that retrieve the latest position of cursors retained in memory by the SDK.
   *
   * The following is an example of retrieving a member's own cursor position:
   *
   * ```[javascript]
   * const myCursor = await space.cursors.getSelf();
   * ```
   *
   * The following is an example payload returned by @space.cursors.getSelf()@:
   *
   * ```[json]
   * {
   *   “clientId”: “DzOBJqgGXzyUBb816Oa6i”,
   *   “connectionId”: “__UJBKZchX”,
   *   "position": {
   *     "x": 864,
   *     "y": 32
   *   }
   * }
   * ```
   *
   * The following is an example of retrieving the cursor positions for all members other than the member themselves:
   *
   * ```[javascript]
   * const othersCursors = await space.cursors.getOthers();
   * ```
   *
   * The following is an example payload returned by @space.cursors.getOthers()@:
   *
   * ```[json]
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
   *
   * The following is an example of retrieving the cursor positions for all members, including the member themselves. @getAll()@ is useful for retrieving the initial position of members' cursors.
   *
   * ```[javascript]
   * const allCursors = await space.cursors.getAll();
   * ```
   *
   * The following is an example payload returned by @space.cursors.getAll()@:
   *
   * ```[json]
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
   */
  async getAll(): Promise<Record<string, null | CursorUpdate>> {
    const channel = this.getChannel();
    return await this.cursorHistory.getLastCursorUpdate(channel, this.options.paginationLimit);
  }
}
