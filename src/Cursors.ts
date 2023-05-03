import { Types } from 'ably';

import Space from './Space';
import Cursor from './Cursor';
import CursorBatching from './CursorBatching';
import CursorDispensing from './CursorDispensing';
import { CURSOR_UPDATE, SPACE_CHANNEL_PREFIX } from './utilities/Constants';
import EventEmitter from './utilities/EventEmitter';
import CursorHistory from './CursorHistory';

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

  cursors: Record<string, Cursor> = {};

  constructor(private space: Space) {
    super();

    this.channel = space.client.channels.get(`${SPACE_CHANNEL_PREFIX}_${space.name}_cursors`);
    this.cursorBatching = new CursorBatching(this, this.channel);

    this.cursorDispensing = new CursorDispensing(this);
    this.channel.subscribe(CURSOR_UPDATE, (message) => this.cursorDispensing.processBatch(message));

    this.cursorHistory = new CursorHistory(this.channel);
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
}

export { type CursorPosition, type CursorData, type CursorUpdate };
