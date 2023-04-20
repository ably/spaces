import EventEmitter from './utilities/EventEmitter';
import Cursors, { CursorPosition } from './Cursors';
import CursorBatching from './CursorBatching';
import Space from './Space';
import { SPACE_CHANNEL_PREFIX } from './utilities/Constants';
import { Types } from 'ably';

type CursorEventMap = { positionUpdate: CursorPosition[] };

export default class Cursor extends EventEmitter<CursorEventMap> {
  constructor(private name: string, private cursorBatching: CursorBatching, private space: Space) {
    super();
  }

  setPosition(position: CursorPosition) {
    this.cursorBatching.pushCursorPosition(this.name, position);
  }
}
