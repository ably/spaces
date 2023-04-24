import Space from './Space';
import Cursor from './Cursor';
import CursorBatching from './CursorBatching';
import { SPACE_CHANNEL_PREFIX } from './utilities/Constants';
import { Types } from 'ably';
import EventEmitter from './utilities/EventEmitter';

type CursorsEventMap = { positionsUpdate: Record<string, CursorPosition[]> };

export type CursorPosition = { x: number; y: number };
export default class Cursors extends EventEmitter<CursorsEventMap> {
  private readonly cursorBatching: CursorBatching;

  private cursors: Record<string, Cursor> = {};
  private channel: Types.RealtimeChannelPromise;

  constructor(private space: Space) {
    super();
    this.channel = space.client.channels.get(`${SPACE_CHANNEL_PREFIX}_${space.name}_cursors`);
    this.channel.subscribe('cursors', this.onIncomingCursorMovement.bind(this));
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

  get(name: string): Cursor {
    if (!this.cursors[name]) {
      this.cursors[name] = new Cursor(name, this.cursorBatching);
    }
    return this.cursors[name];
  }
}
