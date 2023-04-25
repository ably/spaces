import EventEmitter from './utilities/EventEmitter';
import { CursorData, CursorPosition } from './Cursors';
import CursorBatching from './CursorBatching';

type CursorEventMap = { positionUpdate: CursorPosition[]; cursorDataUpdate: CursorData[] };

export default class Cursor extends EventEmitter<CursorEventMap> {
  constructor(private name: string, private cursorBatching: CursorBatching) {
    super();
  }

  setData(data: CursorData) {
    this.cursorBatching.pushCursorData(this.name, data);
  }

  setPosition(position: CursorPosition) {
    this.cursorBatching.pushCursorPosition(this.name, position);
  }
}
