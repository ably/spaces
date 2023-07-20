import { Types } from 'ably';

import Space from './Space.js';
import CursorBatching from './CursorBatching.js';
import CursorDispensing from './CursorDispensing.js';
import { OUTGOING_BATCH_TIME_DEFAULT, PAGINATION_LIMIT_DEFAULT } from './utilities/Constants.js';
import EventEmitter from './utilities/EventEmitter.js';
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
  private channel: Types.RealtimeChannelPromise;
  readonly options: StrictCursorsOptions;

  constructor(private space: Space, options: CursorsOptions = {}) {
    super();
    this.options = {
      outboundBatchInterval: OUTGOING_BATCH_TIME_DEFAULT,
      paginationLimit: PAGINATION_LIMIT_DEFAULT,
    };

    for (const option in options) {
      if (options[option]) this.options[option] = options[option];
    }

    const spaceChannelName = space.getChannelName();

    this.channel = space.client.channels.get(`${spaceChannelName}_cursors`);
    this.cursorBatching = new CursorBatching(this.channel, this.options.outboundBatchInterval);
    this.cursorHistory = new CursorHistory(this.channel, this.options.paginationLimit);
    this.cursorDispensing = new CursorDispensing(this, this.cursorBatching);
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

    this.cursorBatching.pushCursorPosition(cursor);
  }

  private isUnsubscribed() {
    return !emitterHasListeners(this.channel['subscriptions']);
  }

  private subscribe() {
    this.channel.subscribe(CURSOR_UPDATE, (message) => {
      this.cursorDispensing.processBatch(message);
    });
  }

  private unsubscribe() {
    this.channel.unsubscribe();
  }

  on(...args) {
    super.on(...args);

    if (this.isUnsubscribed()) {
      this.subscribe();
    }
  }

  off(...args) {
    super.off(...args);
    const hasListeners = emitterHasListeners(this);

    if (args.length > 0 || !hasListeners) {
      this.unsubscribe();
    }
  }

  async getAll() {
    return await this.cursorHistory.getLastCursorUpdate();
  }
}

export { type CursorPosition, type CursorData, type CursorUpdate };
