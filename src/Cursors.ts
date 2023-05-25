import { Types } from 'ably';
import Space from './Space';
import Cursor from './Cursor';
import CursorBatching from './CursorBatching';
import CursorDispensing from './CursorDispensing';
import {
  CURSOR_UPDATE,
  OUTGOING_BATCH_TIME_DEFAULT,
  INCOMING_BATCH_TIME_DEFAULT,
  PAGINATION_LIMIT_DEFAULT,
} from './utilities/Constants';
import EventEmitter from './utilities/EventEmitter';
import CursorHistory from './CursorHistory';
import type { CursorsOptions, StrictCursorsOptions } from './options/CursorsOptions';

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
  cursorUpdateListener: Types.messageCallback<Types.Message>;

  cursors: Record<string, Cursor> = {};

  constructor(private space: Space, options: CursorsOptions = {}) {
    super();
    this.options = {
      outboundBatchInterval: OUTGOING_BATCH_TIME_DEFAULT,
      inboundBatchInterval: INCOMING_BATCH_TIME_DEFAULT,
      paginationLimit: PAGINATION_LIMIT_DEFAULT,
    };

    for (const option in options) {
      if (options[option]) this.options[option] = options[option];
    }
    const spaceChannelName = space.getChannelName();
    this.channel = space.client.channels.get(`${spaceChannelName}_cursors`);
    this.cursorBatching = new CursorBatching(this, this.channel, this.options.outboundBatchInterval);

    this.cursorDispensing = new CursorDispensing(this, this.options.inboundBatchInterval);
    this.cursorUpdateListener = (message: Types.Message) => this.onCursorUpdate(message);
    this.channel.subscribe(CURSOR_UPDATE, this.cursorUpdateListener);

    this.cursorHistory = new CursorHistory(this.channel, this.options.paginationLimit);
  }

  get(name: string): Cursor {
    if (!this.cursors[name]) {
      this.cursors[name] = new Cursor(name, this.cursorBatching);
    }

    return this.cursors[name];
  }

  async getAll(cursorName?: string) {
    return await this.cursorHistory.getLastCursorUpdate(cursorName);
  }

  onCursorUpdate(message: Types.Message) {
    console.log('cursor_update message recvd');
    this.cursorDispensing.processBatch(message);
  }

  onPageHidden() {
    this.channel.unsubscribe(CURSOR_UPDATE, this.cursorUpdateListener);
  }

  onPageVisible() {
    this.channel.subscribe(CURSOR_UPDATE, this.cursorUpdateListener);
  }
}

export { type CursorPosition, type CursorData, type CursorUpdate };
