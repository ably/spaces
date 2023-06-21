import { Types } from 'ably';

import EventEmitter from './utilities/EventEmitter.js';
import { type CursorUpdate } from './Cursors.js';

import CursorBatching from './CursorBatching.js';
import CursorDispensing from './CursorDispensing.js';
import { CURSOR_UPDATE } from './utilities/Constants.js';

type CursorEventMap = { cursorUpdate: CursorUpdate };

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

export default class Cursor extends EventEmitter<CursorEventMap> {
  /**
   * @param {string} name
   * @param {channel} Types.RealtimeChannelPromise
   */
  constructor(
    readonly name: string,
    private readonly channel: Types.RealtimeChannelPromise,
    private cursorBatching: CursorBatching,
    private cursorDispensing: CursorDispensing,
  ) {
    super();
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

  /**
   * Schedules a cursor update event to be sent that will cause the following events to fire
   *
   * @param {CursorUpdate} cursor
   * @return {void}
   */
  set(cursor: Pick<CursorUpdate, 'position' | 'data'>): void {
    this.cursorBatching.pushCursorPosition(this.name, cursor);
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
}
