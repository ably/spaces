import Space from './Space';
import Cursor from './Cursor';
import CursorBatching from './CursorBatching';
import { CURSOR_DATA_EVENT, CURSOR_POSITION_EVENT, SPACE_CHANNEL_PREFIX } from './utilities/Constants';
import { Types } from 'ably';
import EventEmitter from './utilities/EventEmitter';

type CursorsEventMap = {
  positionsUpdate: Record<string, CursorPosition[]>;
  cursorsDataUpdate: Record<string, CursorData[]>;
};

type CursorPosition = { x: number; y: number };

type CursorData = Record<string, unknown>;

export default class Cursors extends EventEmitter<CursorsEventMap> {
  private readonly cursorBatching: CursorBatching;

  private cursors: Record<string, Cursor> = {};
  private channel: Types.RealtimeChannelPromise;

  constructor(private space: Space) {
    super();
    this.channel = space.client.channels.get(`${SPACE_CHANNEL_PREFIX}_${space.name}_cursors`);
    this.channel.subscribe(CURSOR_POSITION_EVENT, this.onIncomingCursorMovement.bind(this));
    this.channel.subscribe(CURSOR_DATA_EVENT, this.onIncomingCursorData.bind(this));
    this.cursorBatching = new CursorBatching(this, this.channel);
  }

  private onIncomingCursorMovement(message: Types.Message) {
    const cursorData: Record<string, CursorPosition[]> = message.data;
    this.emit('positionsUpdate', cursorData);
    for (let cursorName in cursorData) {
      const cursor = this.cursors[cursorName];
      if (!cursor) continue;
      const cursorPositions = cursorData[cursorName];
      cursor.emit('positionUpdate', cursorPositions);
    }
  }

  private onIncomingCursorData(message: Types.Message) {
    const cursorData: Record<string, CursorData[]> = message.data;
    this.emit('cursorsDataUpdate', cursorData);
    for (let cursorName in cursorData) {
      const cursor = this.cursors[cursorName];
      if (!cursor) continue;
      const cursorDataUpdate = cursorData[cursorName];
      cursor.emit('cursorDataUpdate', cursorDataUpdate);
    }
  }

  get(name: string): Cursor {
    if (!this.cursors[name]) {
      this.cursors[name] = new Cursor(name, this.cursorBatching);
    }
    return this.cursors[name];
  }
}

export { type CursorPosition, type CursorData };
