import { Types } from 'ably';

import { CursorUpdate } from './Cursors.js';
import { CURSOR_UPDATE } from './utilities/Constants.js';
import type { StrictCursorsOptions } from './options/CursorsOptions.js';

type OutgoingBuffer = Record<string, Pick<CursorUpdate, 'position' | 'data'>[]>;

export default class CursorBatching {
  outgoingBuffers: OutgoingBuffer = {};

  batchTime: number;

  hasMovement = false;
  // Set to `true` when a cursor position is in the buffer
  isRunning: boolean = false;
  // Set to `true` when the buffer is actively being emptied
  shouldSend: boolean = false;
  // Set to `true` if there is more than one user listening to cursors

  constructor(
    readonly channel: Types.RealtimeChannelPromise,
    readonly outboundBatchInterval: StrictCursorsOptions['outboundBatchInterval'],
  ) {
    this.channel.presence.subscribe(this.onPresenceUpdate.bind(this));
    this.channel.presence.enter();
    this.batchTime = outboundBatchInterval;
  }

  pushCursorPosition(name: string, cursor: Pick<CursorUpdate, 'position' | 'data'>) {
    // Ignore the cursor update if there is no one listening
    if (!this.shouldSend) return;
    this.hasMovement = true;
    this.pushToBuffer(name, cursor);
    this.publishFromBuffer(CURSOR_UPDATE);
  }

  private async onPresenceUpdate() {
    const members = await this.channel.presence.get();
    this.shouldSend = members.length > 1;
    this.batchTime = (members.length - 1) * this.outboundBatchInterval;
  }

  private pushToBuffer(key: string, value: Pick<CursorUpdate, 'position' | 'data'>) {
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
    this.channel.publish(eventName, bufferCopy);
    setTimeout(() => this.batchToChannel(eventName), this.batchTime);
    this.outgoingBuffers = {};
    this.hasMovement = false;
    this.isRunning = true;
  }
}
