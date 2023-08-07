import { Types } from 'ably';

import Space from './Space.js';
import CursorBatching from './CursorBatching.js';
import CursorDispensing from './CursorDispensing.js';
import EventEmitter, {
  InvalidArgumentError,
  inspect,
  type EventKey,
  type EventListener,
} from './utilities/EventEmitter.js';
import CursorHistory from './CursorHistory.js';

import type { CursorsOptions, CursorUpdate } from './types.js';
import type { RealtimeMessage } from './utilities/types.js';

type CursorsEventMap = {
  cursorsUpdate: CursorUpdate;
};

export const CURSOR_UPDATE = 'cursorUpdate';

export default class Cursors extends EventEmitter<CursorsEventMap> {
  private readonly cursorBatching: CursorBatching;
  private readonly cursorDispensing: CursorDispensing;
  private readonly cursorHistory: CursorHistory;
  private channel?: Types.RealtimeChannelPromise;
  readonly options: CursorsOptions;

  constructor(private space: Space) {
    super();

    this.options = this.space.options.cursors;

    this.cursorHistory = new CursorHistory();
    this.cursorBatching = new CursorBatching(this.options.outboundBatchInterval);

    const emitCursorUpdate = (update: CursorUpdate): void => this.emit('cursorsUpdate', update);
    const getCurrentBatchTime: () => number = () => this.cursorBatching.batchTime;
    this.cursorDispensing = new CursorDispensing(emitCursorUpdate, getCurrentBatchTime);
  }

  /**
   * Schedules a cursor update event to be sent that will cause the following events to fire
   *
   * @param {CursorUpdate} cursor
   * @return {void}
   */
  set(cursor: Pick<CursorUpdate, 'position' | 'data'>): void {
    const self = this.space.members.getSelf();

    if (!self) {
      throw new Error('Must enter a space before setting a cursor update');
    }

    const channel = this.getChannel();
    this.cursorBatching.pushCursorPosition(channel, cursor);
  }

  private getChannel(): Types.RealtimeChannelPromise {
    return this.channel ?? (this.channel = this.initializeCursorsChannel());
  }

  private initializeCursorsChannel(): Types.RealtimeChannelPromise {
    const spaceChannelName = this.space.channelName;
    const channel = this.space.client.channels.get(`${spaceChannelName}_cursors`);
    channel.presence.subscribe(this.onPresenceUpdate.bind(this));
    channel.presence.enter();
    return channel;
  }

  private async onPresenceUpdate() {
    const channel = this.getChannel();
    const cursorsMembers = await channel.presence.get();
    this.cursorBatching.setShouldSend(cursorsMembers.length > 1);
    this.cursorBatching.setBatchTime((cursorsMembers.length - 1) * this.options.outboundBatchInterval);
  }

  private isUnsubscribed() {
    const channel = this.getChannel();

    interface ChannelWithSubscriptions extends Types.RealtimeChannelPromise {
      subscriptions: EventEmitter<{}>;
    }

    const subscriptions = (channel as ChannelWithSubscriptions).subscriptions;
    return !this.emitterHasListeners(subscriptions);
  }

  private emitterHasListeners = (emitter: EventEmitter<{}>) => {
    const flattenEvents = (obj: Record<string, Function[]>) =>
      Object.entries(obj)
        .map((_, v) => v)
        .flat();

    return (
      emitter.any.length > 0 ||
      emitter.anyOnce.length > 0 ||
      flattenEvents(emitter.events).length > 0 ||
      flattenEvents(emitter.eventsOnce).length > 0
    );
  };

  subscribe<K extends EventKey<CursorsEventMap>>(
    listenerOrEvents?: K | K[] | EventListener<CursorsEventMap[K]>,
    listener?: EventListener<CursorsEventMap[K]>,
  ) {
    try {
      super.on(listenerOrEvents, listener);
    } catch (e: unknown) {
      if (e instanceof InvalidArgumentError) {
        throw new InvalidArgumentError(
          'Cursors.subscribe(): Invalid arguments: ' + inspect([listenerOrEvents, listener]),
        );
      } else {
        throw e;
      }
    }

    if (this.isUnsubscribed()) {
      const channel = this.getChannel();

      channel.subscribe(CURSOR_UPDATE, (message) => {
        this.cursorDispensing.processBatch(message as RealtimeMessage);
      });
    }
  }

  unsubscribe<K extends EventKey<CursorsEventMap>>(
    listenerOrEvents?: K | K[] | EventListener<CursorsEventMap[K]>,
    listener?: EventListener<CursorsEventMap[K]>,
  ) {
    try {
      super.off(listenerOrEvents, listener);
    } catch (e: unknown) {
      if (e instanceof InvalidArgumentError) {
        throw new InvalidArgumentError(
          'Cursors.unsubscribe(): Invalid arguments: ' + inspect([listenerOrEvents, listener]),
        );
      } else {
        throw e;
      }
    }

    const hasListeners = this.emitterHasListeners(this);

    if (!hasListeners) {
      const channel = this.getChannel();
      channel.unsubscribe();
    }
  }

  async getSelf(): Promise<CursorUpdate | undefined> {
    const self = this.space.members.getSelf();
    if (!self) return;

    const allCursors = await this.getAll();
    return allCursors[self.connectionId] as CursorUpdate;
  }

  async getOthers(): Promise<Record<string, null | CursorUpdate>> {
    const self = this.space.members.getSelf();
    if (!self) return {};

    const allCursors = await this.getAll();
    const allCursorsFiltered = allCursors;
    delete allCursorsFiltered[self.connectionId];
    return allCursorsFiltered;
  }

  async getAll() {
    const channel = this.getChannel();
    return await this.cursorHistory.getLastCursorUpdate(channel, this.options.paginationLimit);
  }
}
