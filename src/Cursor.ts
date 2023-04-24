import EventEmitter from './utilities/EventEmitter';
import { CursorPosition } from './Cursors';
import CursorBatching from './CursorBatching';

type CursorEventMap = { positionUpdate: CursorPosition[] };

export default class Cursor extends EventEmitter<CursorEventMap> {
  constructor(private name: string, private cursorBatching: CursorBatching) {
    super();
  }

  setPosition(position: CursorPosition) {
    this.cursorBatching.pushCursorPosition(this.name, position);
  }
}
