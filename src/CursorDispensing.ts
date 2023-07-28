import { type CursorUpdate } from './types.js';
import { type RealtimeMessage } from './utilities/types.js';

export default class CursorDispensing {
  private buffer: Record<string, { cursor: CursorUpdate; offset: number }[]> = {};

  constructor(private emitCursorUpdate: (update: CursorUpdate) => void) {}

  setEmitCursorUpdate(update: CursorUpdate) {
    this.emitCursorUpdate(update);
  }

  emitFromBatch() {
    for (let connectionId in this.buffer) {
      const buffer = this.buffer[connectionId];
      const update = buffer.shift();

      if (!update) continue;
      setTimeout(() => this.setEmitCursorUpdate(update.cursor), update.offset);
    }

    if (this.bufferHaveData()) {
      this.emitFromBatch();
    }
  }

  bufferHaveData(): boolean {
    return (
      Object.entries(this.buffer)
        .map(([, v]) => v)
        .flat().length > 0
    );
  }

  processBatch(message: RealtimeMessage) {
    const updates: { cursor: CursorUpdate; offset: number }[] = message.data || [];

    updates.forEach((update: { cursor: CursorUpdate; offset: number }) => {
      const enhancedMsg = {
        cursor: {
          clientId: message.clientId,
          connectionId: message.connectionId,
          position: update.cursor.position,
          data: update.cursor.data,
        },
        offset: update.offset,
      };

      if (this.buffer[enhancedMsg.cursor.connectionId]) {
        this.buffer[enhancedMsg.cursor.connectionId].push(enhancedMsg);
      } else {
        this.buffer[enhancedMsg.cursor.connectionId] = [enhancedMsg];
      }
    });

    if (this.bufferHaveData()) {
      this.emitFromBatch();
    }
  }
}
