import Cursors, { CursorUpdate } from './Cursors';
import { Types } from 'ably';
import { CURSOR_EVENT } from './utilities/Constants';

const BATCH_TIME_UPDATE = 100;

type OutgoingBuffer = Record<string, CursorUpdate[]>;

export default class CursorBatching {
  outgoingBuffers: OutgoingBuffer = {};

  batchTime: number = 100;

  hasMovement = false;
  // Set to `true` when a cursor position is in the buffer
  isRunning: boolean = false;
  // Set to `true` when the buffer is actively being emptied
  shouldSend: boolean = false;
  // Set to `true` if there is more than one user listening to cursors

  constructor(readonly cursors: Cursors, readonly channel: Types.RealtimeChannelPromise) {
    this.channel.presence.subscribe(this.onPresenceUpdate.bind(this));
    this.channel.presence.enter();
  }

  pushCursorPosition(name: string, cursor: CursorUpdate) {
    // Ignore the cursor update if there is no one listening
    if (!this.shouldSend) return;
    this.hasMovement = true;
    this.pushToBuffer(name, cursor);
    this.publishFromBuffer(CURSOR_EVENT);
  }

  private async onPresenceUpdate() {
    const members = await this.channel.presence.get();
    this.shouldSend = members.length > 1;
    this.batchTime = (members.length - 1) * BATCH_TIME_UPDATE;
  }

  private pushToBuffer(key: string, value: CursorUpdate) {
    if (this.outgoingBuffers[key]) {
      this.outgoingBuffers[key].push(value);
    } else {
      this.outgoingBuffers[key] = [value];
    }
  }

  private async publishFromBuffer(eventName: string) {
    if (!this.isRunning) {
      this.isRunning = true;
      await this.batchToChannel(eventName);
    }
  }

  private async batchToChannel(eventName: string) {
    if (!this.hasMovement) {
      this.isRunning = false;
      return;
    }
    // Must be copied here to avoid a race condition where the buffer is cleared before the publish happens
    const bufferCopy = { ...this.outgoingBuffers };
    await this.channel.publish(eventName, bufferCopy);
    setTimeout(() => this.batchToChannel(eventName), this.batchTime);
    this.outgoingBuffers = {};
    this.hasMovement = false;
    this.isRunning = true;
  }
}
