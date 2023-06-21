import { Types } from 'ably';

import Cursors, { type CursorUpdate } from './Cursors.js';
import CursorBatching from './CursorBatching.js';

import { clamp } from './utilities/math.js';

export default class CursorDispensing {
  private buffer: Record<string, CursorUpdate[]> = {};
  private handlerRunning: boolean = false;
  private timerIds: ReturnType<typeof setTimeout>[] = [];

  constructor(readonly cursors: Cursors, readonly cursorsBatching: CursorBatching) {}

  emitFromBatch(batchDispenseInterval: number) {
    if (!this.bufferHaveData()) {
      this.handlerRunning = false;
      return;
    }

    this.handlerRunning = true;

    const processBuffer = () => {
      for (let connectionId in this.buffer) {
        const buffer = this.buffer[connectionId];
        const update = buffer.shift();

        if (!update) continue;
        this.cursors.emit('cursorsUpdate', update);

        const cursor = this.cursors.cursors[update.name];
        if (!cursor) continue;
        cursor.emit('cursorUpdate', update);
      }

      if (this.bufferHaveData()) {
        this.emitFromBatch(this.calculateDispenseInterval());
      } else {
        this.handlerRunning = false;
      }

      this.timerIds.shift();
    };

    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      this.timerIds.forEach((id) => clearTimeout(id));
      this.timerIds = [];
      processBuffer();
    } else {
      this.timerIds.push(setTimeout(processBuffer, batchDispenseInterval));
    }
  }

  bufferHaveData(): boolean {
    return (
      Object.entries(this.buffer)
        .map(([, v]) => v)
        .flat().length > 0
    );
  }

  calculateDispenseInterval(): number {
    const bufferLengths = Object.entries(this.buffer).map(([, v]) => v.length);
    const highest = bufferLengths.sort()[bufferLengths.length - 1];
    const finalOutboundBatchInterval = this.cursorsBatching.batchTime;
    return Math.floor(clamp(finalOutboundBatchInterval / highest, 1, 1000 / 15));
  }

  processBatch(message: Types.Message) {
    Object.keys(message.data).forEach((name) => {
      const updates = message.data[name] || [];

      updates.forEach((update) => {
        const enhancedMsg = {
          name,
          clientId: message.clientId,
          connectionId: message.connectionId,
          position: update.position,
          data: update.data,
        };

        if (this.buffer[enhancedMsg.connectionId]) {
          this.buffer[enhancedMsg.connectionId].push(enhancedMsg);
        } else {
          this.buffer[enhancedMsg.connectionId] = [enhancedMsg];
        }
      });
    });

    if (!this.handlerRunning && this.bufferHaveData()) {
      this.emitFromBatch(this.calculateDispenseInterval());
    }
  }
}
