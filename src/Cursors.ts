import { Types } from 'ably';

import Space from './Space.js';
import Cursor from './Cursor.js';
import CursorBatching from './CursorBatching.js';
import CursorDispensing from './CursorDispensing.js';
import { OUTGOING_BATCH_TIME_DEFAULT, PAGINATION_LIMIT_DEFAULT } from './utilities/Constants.js';
import EventEmitter from './utilities/EventEmitter.js';
import CursorHistory from './CursorHistory.js';
import type { CursorsOptions, StrictCursorsOptions } from './options/CursorsOptions.js';

type CursorPosition = { x: number; y: number };

type CursorData = Record<string, unknown>;

type CursorUpdate = {
  name: string;
  clientId: string;
  connectionId: string;
  position: CursorPosition;
  data?: CursorData;
};

type CursorsEventMap = {
  cursorsUpdate: Record<string, CursorUpdate>;
};

export default class Cursors extends EventEmitter<CursorsEventMap> {
  private readonly cursorBatching: CursorBatching;
  private readonly cursorDispensing: CursorDispensing;
  private readonly cursorHistory: CursorHistory;
  private channel: Types.RealtimeChannelPromise;
  readonly options: StrictCursorsOptions;

  cursors: Record<string, Cursor> = {};

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

  get(name: string): Cursor {
    if (!this.cursors[name]) {
      this.cursors[name] = new Cursor(name, this.channel, this.cursorBatching, this.cursorDispensing);
    }

    return this.cursors[name];
  }

  async getAll(cursorName?: string) {
    return await this.cursorHistory.getLastCursorUpdate(cursorName);
  }
}

export { type CursorPosition, type CursorData, type CursorUpdate };
