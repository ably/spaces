import { RealtimeChannel } from 'ably';

import Space from './Space.js';
import CursorBatching from './CursorBatching.js';
import CursorDispensing from './CursorDispensing.js';
import EventEmitter, { InvalidArgumentError, inspect, type EventListener } from './utilities/EventEmitter.js';
import CursorHistory from './CursorHistory.js';
import { CURSOR_UPDATE } from './CursorConstants.js';

import type { CursorsOptions, CursorUpdate } from './types.js';
import type { RealtimeInboundMessage } from './utilities/types.js';
import { ERR_NOT_ENTERED_SPACE } from './Errors.js';

/**
 * The property names of `CursorsEventMap` are the names of the events emitted by {@link Cursors}.
 */
export interface CursorsEventMap {
  /**
   * A space member moved their cursor.
   */
  update: CursorUpdate;
}

const CURSORS_CHANNEL_TAG = '::$cursors';

/**
 * [Live cursors](https://ably.com/docs/spaces/cursors) enable you to track the cursors of members within a {@link Space | space} in realtime.
 *
 * Cursor events are emitted whenever a member moves their mouse within a space. In order to optimize the efficiency and frequency of updates, cursor position events are automatically batched. The batching interval may be customized in order to further optimize for increased performance versus the number of events published.
 *
 * Live cursor updates are not available as part of the {@link Space.subscribe | space state} and must be subscribed to using {@link Cursors.subscribe | `space.cursors.subscribe()`}.
 *
 */
export default class Cursors extends EventEmitter<CursorsEventMap> {
  private readonly cursorBatching: CursorBatching;
  private readonly cursorDispensing: CursorDispensing;
  private readonly cursorHistory: CursorHistory;
  /**
   * The {@link SpaceOptions.cursors | cursors options} passed to {@link default.get | `Spaces.get()`}.
   */
  readonly options: CursorsOptions;
  private readonly channelName: string;

  /**
   * The [realtime channel](https://ably.com/docs/channels) instance that this `Cursors` instance uses for transmitting and receiving data.
   */
  public channel?: RealtimeChannel;

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
   * Set the position of a member's cursor and emit an {@link CursorUpdate | `update`} event.
   *
   * A position must contain an X-axis value and a Y-axis value to set the cursor position on a 2D plane. Data may optionally be passed containing additional information such as the color the cursor should be displayed as, or the ID of the element the member is dragging.
   *
   * A member must have been {@link Space.enter | entered} into the space to set their cursor position.
   *
   * @return {void}
   *
   * The following is an example of a member setting their cursor position by adding an event listener to obtain their cursor coordinates and then publishing their position using the `set()` method:
   *
   * ```javascript
   * window.addEventListener('mousemove', ({ clientX, clientY }) => {
   *   space.cursors.set({ position: { x: clientX, y: clientY }, data: { color: 'red' } });
   * });
   * ```
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

  private getChannel(): RealtimeChannel {
    return this.channel ?? (this.channel = this.initializeCursorsChannel());
  }

  private initializeCursorsChannel(): RealtimeChannel {
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

    interface ChannelWithSubscriptions extends RealtimeChannel {
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
   * Subscribe to cursor events by registering a listener. Cursor events are emitted whenever a member {@link Cursors.set | sets} their cursor position.
   *
   * > **Note**
   * >
   * > The rate at which cursor events are published is controlled by the {@link CursorsOptions.outboundBatchInterval | `outboundBatchInterval`} property set in the `CursorsOptions` of a space.
   *
   * The following is an example of subscribing to cursor events:
   *
   * ```javascript
   * space.cursors.subscribe('update', (cursorUpdate) => {
   *   console.log(cursorUpdate);
   * });
   * ```
   *
   * @param eventOrEvents An event name, or an array of event names.
   * @param listener An event listener.
   *
   * @typeParam K A type which allows one or more names of the properties of the {@link CursorsEventMap} type.
   */
  subscribe<K extends keyof CursorsEventMap>(
    eventOrEvents: K | K[],
    listener?: EventListener<CursorsEventMap, K>,
  ): void;
  /**
   * Subscribe to cursor updates by registering a listener for all events.
   *
   * @param listener An event listener.
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
        this.cursorDispensing.processBatch(message as RealtimeInboundMessage);
      });
    }
  }

  /**
   * {@label WITH_EVENTS}
   *
   * Unsubscribe from cursor events to remove previously registered listeners.
   *
   * The following is an example of removing a listener for cursor {@link CursorUpdate | `update`} events:
   *
   * ```javascript
   * space.cursors.unsubscribe(`update`, listener);
   * ```
   *
   * @param eventOrEvents An event name, or an array of event names.
   * @param listener An event listener.
   *
   * @typeParam K A type which allows one or more names of the properties of the {@link CursorsEventMap} type.
   */
  unsubscribe<K extends keyof CursorsEventMap>(
    eventOrEvents: K | K[],
    listener?: EventListener<CursorsEventMap, K>,
  ): void;
  /**
   * Unsubscribe from all events to remove previously registered listeners.
   *
   * The following is an example of removing a listener for all events:
   *
   * ```javascript
   * space.cursors.unsubscribe(listener);
   * ```
   *
   * @param listener An event listener.
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
   *
   * Retrieve the cursor position of the current member in a one-off call.
   *
   * The following is an example of retrieving a member's own cursor position:
   *
   * ```javascript
   * const selfPosition = await space.cursors.getSelf();
   * ```
   */
  async getSelf(): Promise<CursorUpdate | null> {
    const self = await this.space.members.getSelf();
    if (!self) return null;

    const allCursors = await this.getAll();
    return allCursors[self.connectionId];
  }

  /**
   * Retrieve the cursor position of all members other than the member themselves in a one-off call.
   *
   * The following is an example of retrieving the cursor positions of all members, except the member themselves:
   *
   * ```javascript
   * const otherPositions = await space.cursors.getOthers();
   * ```
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
   * Retrieve the cursor position of all members in a one-off call. This is useful for retrieving the initial position of members's cursors.
   *
   * The following is an example of retrieving the cursor positions for all members:
   *
   * ```javascript
   * const allCursors = await space.cursors.getAll();
   * ```
   */
  async getAll(): Promise<Record<string, null | CursorUpdate>> {
    const channel = this.getChannel();
    return await this.cursorHistory.getLastCursorUpdate(channel, this.options.paginationLimit);
  }
}
