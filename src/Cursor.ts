import EventEmitter from './utilities/EventEmitter';
import { type CursorUpdate } from './Cursors';
import CursorBatching from './CursorBatching';

type CursorEventMap = { cursorUpdate: CursorUpdate };

/** Class that enables updating and emitting events for a specific cursor. */
export default class Cursor extends EventEmitter<CursorEventMap> {
  /**
   * @param {string} name
   * @param {CursorBatching} cursorBatching
   */
  constructor(private name: string, private cursorBatching: CursorBatching) {
    super();
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
}
