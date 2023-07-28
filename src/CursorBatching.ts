import { Types } from 'ably';

import { CURSOR_UPDATE } from './CursorConstants.js';
import type { CursorUpdate } from './types.js';
import type { CursorsOptions } from './types.js';

type OutgoingBuffer = { cursor: Pick<CursorUpdate, 'position' | 'data'>; offset: number };

export default class CursorBatching {
  outgoingBuffer: OutgoingBuffer[] = [];

  batchTime: number;

  // Set to `true` when a cursor position is in the buffer
  hasMovement = false;

  // Set to `true` when the buffer is actively being emptied
  isRunning: boolean = false;

  // Set to `true` if there is more than one user listening to cursors
  shouldSend: boolean = false;

  // Used for tracking offsets in the buffer
  bufferStartTimestamp: number = 0;

  constructor(readonly outboundBatchInterval: CursorsOptions['outboundBatchInterval']) {
    this.batchTime = outboundBatchInterval;
  }

  pushCursorPosition(channel: Types.RealtimeChannelPromise, cursor: Pick<CursorUpdate, 'position' | 'data'>) {
    // Ignore the cursor update if there is no one listening
    if (!this.shouldSend) return;

    const timestamp = new Date().getTime();

    let offset: number;
    // First update in the buffer is always 0
    if (this.outgoingBuffer.length === 0) {
      offset = 0;
      this.bufferStartTimestamp = timestamp;
    } else {
      // Add the offset compared to the first update in the buffer
      offset = timestamp - this.bufferStartTimestamp;
    }

    this.hasMovement = true;
    this.pushToBuffer({ cursor, offset });
    this.publishFromBuffer(channel, CURSOR_UPDATE);
  }

  setShouldSend(shouldSend: boolean) {
    this.shouldSend = shouldSend;
  }

  setBatchTime(batchTime: number) {
    this.batchTime = batchTime;
  }

  private pushToBuffer(value: OutgoingBuffer) {
    this.outgoingBuffer.push(value);
  }

  private async publishFromBuffer(channel: Types.RealtimeChannelPromise, eventName: string) {
    if (!this.isRunning) {
      this.isRunning = true;
      await this.batchToChannel(channel, eventName);
    }
  }

  private async batchToChannel(channel: Types.RealtimeChannelPromise, eventName: string) {
    if (!this.hasMovement) {
      this.isRunning = false;
      return;
    }
    // Must be copied here to avoid a race condition where the buffer is cleared before the publish happens
    const bufferCopy = [...this.outgoingBuffer];
    channel.publish(eventName, bufferCopy);
    setTimeout(() => this.batchToChannel(channel, eventName), this.batchTime);
    this.outgoingBuffer = [];
    this.hasMovement = false;
    this.isRunning = true;
  }
}
