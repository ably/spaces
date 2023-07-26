import { Types } from 'ably';

import Space from './Space.js';
import CursorBatching from './CursorBatching.js';
import CursorDispensing from './CursorDispensing.js';
import { OUTGOING_BATCH_TIME_DEFAULT, PAGINATION_LIMIT_DEFAULT } from './utilities/Constants.js';
import EventEmitter, {
  InvalidArgumentError,
  inspect,
  type EventKey,
  type EventListener,
} from './utilities/EventEmitter.js';
import CursorHistory from './CursorHistory.js';
import { CURSOR_UPDATE } from './utilities/Constants.js';

import type { CursorsOptions, StrictCursorsOptions } from './options/CursorsOptions.js';

type CursorPosition = { x: number; y: number };

type CursorData = Record<string, unknown>;

type CursorUpdate = {
  clientId: string;
  connectionId: string;
  position: CursorPosition;
  data?: CursorData;
};

type CursorsEventMap = {
  cursorsUpdate: Record<string, CursorUpdate>;
};

const emitterHasListeners = (emitter) => {
  const flattenEvents = (obj) =>
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

export default class Cursors extends EventEmitter<CursorsEventMap> {
  private readonly cursorBatching: CursorBatching;
  private readonly cursorDispensing: CursorDispensing;
  private readonly cursorHistory: CursorHistory;
  private channel?: Types.RealtimeChannelPromise;
  readonly options: StrictCursorsOptions;

  constructor(private space: Space, options: CursorsOptions = {}) {
    super();

    this.options = {
      outboundBatchInterval: options['outboundBatchInterval'] ?? OUTGOING_BATCH_TIME_DEFAULT,
      paginationLimit: options['paginationLimit'] ?? PAGINATION_LIMIT_DEFAULT,
    };

    this.cursorHistory = new CursorHistory();
    this.cursorBatching = new CursorBatching(this.options.outboundBatchInterval);

    const emitCursorUpdate = (update: CursorUpdate): void => this.emit('cursorsUpdate', update);
    const getCurrentBatchTime: () => number = () => this.cursorBatching.batchTime;
    this.cursorDispensing = new CursorDispensing(emitCursorUpdate, getCurrentBatchTime);
  }

  /**
   * Schedules a cursor update event to be sent that will cause the following events to fire
   *
   * @param {CursorUpdate} cursor
   * @return {void}
   */
  set(cursor: Pick<CursorUpdate, 'position' | 'data'>): void {
    const self = this.space.getSelf();

    if (!self) {
      throw new Error('Must enter a space before setting a cursor update');
    }

    const channel = this.getChannel();
    this.cursorBatching.pushCursorPosition(channel, cursor);
  }

  private getChannel(): Types.RealtimeChannelPromise {
    return this.channel ?? (this.channel = this.initializeCursorsChannel());
  }

  private initializeCursorsChannel(): Types.RealtimeChannelPromise {
    const spaceChannelName = this.space.getChannelName();
    const channel = this.space.client.channels.get(`${spaceChannelName}_cursors`);
    channel.presence.subscribe(this.onPresenceUpdate.bind(this));
    channel.presence.enter();
    return channel;
  }

  private async onPresenceUpdate() {
    const channel = this.getChannel();
    const cursorsMembers = await channel.presence.get();
    this.cursorBatching.setShouldSend(cursorsMembers.length > 1);
    this.cursorBatching.setBatchTime((cursorsMembers.length - 1) * this.options.outboundBatchInterval);
  }

  private isUnsubscribed() {
    const channel = this.getChannel();
    return !emitterHasListeners(channel['subscriptions']);
  }

  subscribe<K extends EventKey<CursorsEventMap>>(
    listenerOrEvents?: K | K[] | EventListener<CursorsEventMap[K]>,
    listener?: EventListener<CursorsEventMap[K]>,
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
        this.cursorDispensing.processBatch(message);
      });
    }
  }

  unsubscribe<K extends EventKey<CursorsEventMap>>(
    listenerOrEvents?: K | K[] | EventListener<CursorsEventMap[K]>,
    listener?: EventListener<CursorsEventMap[K]>,
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

    const hasListeners = emitterHasListeners(this);

    if (!hasListeners) {
      const channel = this.getChannel();
      channel.unsubscribe();
    }
  }

  async getAll() {
    const channel = this.getChannel();
    return await this.cursorHistory.getLastCursorUpdate(channel, this.options.paginationLimit);
  }
}

export { type CursorPosition, type CursorData, type CursorUpdate };
