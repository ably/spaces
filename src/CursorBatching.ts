import Cursors, { CursorPosition } from './Cursors';
import { Types } from 'ably';

const BATCH_TIME_UPDATE = 100;

export default class CursorBatching {
  outgoingBuffer: Record<string, CursorPosition[]> = {};

  batchTime: number = 100;
  // Set to `true` when the buffer is actively being emptied
  isRunning: boolean = false;
  // Set to `true` when a cursor position is in the buffer
  hasMovements: boolean = false;
  // Set to `true` if there is more than one user listening to cursors
  shouldSend: boolean = false;

  constructor(readonly cursors: Cursors, readonly channel: Types.RealtimeChannelPromise) {
    this.channel.presence.subscribe(this.onPresenceUpdate.bind(this));
    this.channel.presence.enter();
  }

  async onPresenceUpdate() {
    const members = await this.channel.presence.get();
    this.shouldSend = members.length > 1;
    this.batchTime = (members.length - 1) * BATCH_TIME_UPDATE;
  }

  pushCursorPosition(name: string, pos: CursorPosition) {
    // Ignore the cursor update if there is no one listening
    if (!this.shouldSend) return;
    this.hasMovements = true;
    if (this.outgoingBuffer[name]) {
      this.outgoingBuffer[name].push(pos);
    } else {
      this.outgoingBuffer[name] = [pos];
    }
    if (!this.isRunning) {
      this.batchCursors();
      this.isRunning = true;
    }
  }

  async batchCursors() {
    if (!this.hasMovements) {
      this.isRunning = false;
      return;
    }
    // Must be copied here to avoid a race condition where the buffer is cleared before the publish happens
    const bufferCopy = { ...this.outgoingBuffer };
    this.outgoingBuffer = {};
    this.hasMovements = false;
    await this.channel.publish('cursors', bufferCopy);
    setTimeout(this.batchCursors, this.batchTime);
  }
}
