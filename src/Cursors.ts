import Space from './Space';
import Cursor from './Cursor';
import CursorBatching from './CursorBatching';
import { CURSOR_UPDATE, SPACE_CHANNEL_PREFIX } from './utilities/Constants';
import { Types } from 'ably';
import EventEmitter from './utilities/EventEmitter';

type CursorPosition = { x: number; y: number };

type CursorData = Record<string, unknown>;

type CursorUpdate = {
  position: CursorPosition;
  data?: CursorData;
};

type CursorsEventMap = {
  cursorsUpdate: Record<string, CursorUpdate[]>;
};

export default class Cursors extends EventEmitter<CursorsEventMap> {
  private readonly cursorBatching: CursorBatching;

  private cursors: Record<string, Cursor> = {};
  private channel: Types.RealtimeChannelPromise;

  constructor(private space: Space) {
    super();
    this.channel = space.client.channels.get(`${SPACE_CHANNEL_PREFIX}_${space.name}_cursors`);
    this.channel.subscribe(CURSOR_UPDATE, this.onIncomingCursorUpdate.bind(this));
    this.cursorBatching = new CursorBatching(this, this.channel);
  }

  private onIncomingCursorUpdate(message: Types.Message) {
    const cursorData: Record<string, CursorUpdate[]> = message.data;
    this.emit('cursorsUpdate', cursorData);
    for (let cursorName in cursorData) {
      const cursor = this.cursors[cursorName];
      if (!cursor) continue;
      const cursorPositions = cursorData[cursorName];
      cursor.emit('cursorUpdate', cursorPositions);
    }
  }

  get(name: string): Cursor {
    if (!this.cursors[name]) {
      this.cursors[name] = new Cursor(name, this.cursorBatching);
    }
    return this.cursors[name];
  }
}

export { type CursorPosition, type CursorData, type CursorUpdate };
