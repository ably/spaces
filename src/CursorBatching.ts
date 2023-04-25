import Cursors, { CursorData, CursorPosition } from './Cursors';
import { Types } from 'ably';

const BATCH_TIME_UPDATE = 100;

const CURSOR_POSITION_CHANNEL = 'cursorPosition';
const CURSOR_DATA_CHANNEL = 'cursorDataUpdate';

type OutgoingBuffers = {
  movement: Record<string, CursorPosition[]>;
  data: Record<string, CursorData[]>;
};

type AreBuffersActive = {
  movement: boolean;
  data: boolean;
};

export default class CursorBatching {
  outgoingBuffers: OutgoingBuffers = {
    movement: {},
    data: {},
  };

  has: AreBuffersActive = {
    // Set to `true` when a cursor position is in the buffer
    movement: false,
    // Set to 'true' when an update to cursor data is in the buffer
    data: false,
  };

  batchTime: number = 100;
  // Set to `true` when the buffer is actively being emptied
  isRunning: boolean = false;
  // Set to `true` if there is more than one user listening to cursors
  shouldSend: boolean = false;

  constructor(readonly cursors: Cursors, readonly channel: Types.RealtimeChannelPromise) {
    this.channel.presence.subscribe(this.onPresenceUpdate.bind(this));
    this.channel.presence.enter();
  }

  pushCursorPosition(name: string, pos: CursorPosition) {
    // Ignore the cursor update if there is no one listening
    if (!this.shouldSend) return;
    this.has.movement = true;
    this.pushToBuffer<CursorPosition>('movement', name, pos);
    this.publishFromBuffer('movement', CURSOR_POSITION_CHANNEL);
  }

  pushCursorData(name: string, data: CursorData) {
    // Ignore the cursor update if there is no one listening
    if (!this.shouldSend) return;
    this.has.data = true;
    this.pushToBuffer<CursorData>('data', name, data);
    this.publishFromBuffer('data', CURSOR_DATA_CHANNEL);
  }

  private async onPresenceUpdate() {
    const members = await this.channel.presence.get();
    this.shouldSend = members.length > 1;
    this.batchTime = (members.length - 1) * BATCH_TIME_UPDATE;
  }

  private pushToBuffer<T>(bufferName: string, key: string, value: T) {
    const buffer: Record<string, T[]> = this.outgoingBuffers[bufferName];
    if (buffer[key]) {
      buffer[key].push(value);
    } else {
      (buffer[key] as T[]) = [value];
    }
  }

  private async publishFromBuffer(bufferName: keyof OutgoingBuffers, channelName: string) {
    if (!this.isRunning) {
      this.isRunning = true;
      await this.batchToChannel(bufferName, channelName);
    }
  }

  private async batchToChannel(bufferName: keyof OutgoingBuffers, channelName: string) {
    if (!this.has.movement) {
      this.isRunning = false;
      return;
    }
    // Must be copied here to avoid a race condition where the buffer is cleared before the publish happens
    const bufferCopy = { ...this.outgoingBuffers[bufferName] };
    await this.channel.publish(channelName, bufferCopy);
    setTimeout(() => this.batchToChannel(bufferName, channelName), this.batchTime);
    this.outgoingBuffers[bufferName] = {};
    this.has[bufferName] = false;
    this.isRunning = true;
  }
}

export { CURSOR_DATA_CHANNEL, CURSOR_POSITION_CHANNEL };
