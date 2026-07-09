import { RealtimeChannel } from 'ably';

import { CURSOR_UPDATE } from './CursorConstants.js';
import type { CursorUpdate } from './types.js';
import type { CursorsOptions } from './types.js';

export type OutgoingBuffer = { cursor: Pick<CursorUpdate, 'position' | 'data'>; offset: number };

export default class CursorBatching {
  outgoingBuffer: OutgoingBuffer[] = [];
  pendingBuffer: OutgoingBuffer[] = [];

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

  pushCursorPosition(channel: RealtimeChannel, cursor: Pick<CursorUpdate, 'position' | 'data'>) {
    const timestamp = new Date().getTime();

    let offset: number;
    // First update in the buffer is always 0
    if (this.outgoingBuffer.length === 0 && this.pendingBuffer.length === 0) {
      offset = 0;
      this.bufferStartTimestamp = timestamp;
    } else {
      // Add the offset compared to the first update in the buffer
      offset = timestamp - this.bufferStartTimestamp;
    }

    const bufferItem = { cursor, offset };

    if (!this.shouldSend) {
      // Queue cursor positions when channel is not ready (no one listening yet)
      this.pushToPendingBuffer(bufferItem);
      return;
    }

    this.hasMovement = true;
    this.pushToBuffer(bufferItem);
    this.publishFromBuffer(channel, CURSOR_UPDATE);
  }

  setShouldSend(shouldSend: boolean) {
    const wasSending = this.shouldSend;
    this.shouldSend = shouldSend;

    // If we just became ready to send and have pending cursor positions, process them
    if (!wasSending && this.shouldSend && this.pendingBuffer.length > 0) {
      this.processPendingBuffer();
    }
  }

  setBatchTime(batchTime: number) {
    this.batchTime = batchTime;
  }

  private pushToBuffer(value: OutgoingBuffer) {
    this.outgoingBuffer.push(value);
  }

  private pushToPendingBuffer(value: OutgoingBuffer) {
    this.pendingBuffer.push(value);
  }

  private processPendingBuffer() {
    // Move all pending cursor positions to outgoing buffer
    for (const item of this.pendingBuffer) {
      this.pushToBuffer(item);
    }

    // Clear pending buffer
    this.pendingBuffer = [];

    // Start publishing if we have cursor movements
    if (this.outgoingBuffer.length > 0) {
      this.hasMovement = true;
      // Note: We need the channel to publish, but since setShouldSend doesn't have it,
      // we'll need to trigger this from the caller that has access to the channel
    }
  }

  // Method to manually trigger publishing when pending items are processed
  triggerPublishFromPending(channel: RealtimeChannel) {
    if (this.outgoingBuffer.length > 0) {
      this.hasMovement = true;
      this.publishFromBuffer(channel, CURSOR_UPDATE);
    }
  }

  private async publishFromBuffer(channel: RealtimeChannel, eventName: string) {
    if (!this.isRunning) {
      this.isRunning = true;
      await this.batchToChannel(channel, eventName);
    }
  }

  private async batchToChannel(channel: RealtimeChannel, eventName: string) {
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
