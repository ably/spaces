import { it, describe, expect, vi, beforeEach, vitest, afterEach } from 'vitest';
import { Realtime, Types } from 'ably/promises';

import Space from './Space.js';
import Cursors from './Cursors.js';
import { CURSOR_UPDATE } from './CursorConstants.js';
import { createPresenceMessage } from './utilities/test/fakes.js';
import CursorBatching from './CursorBatching.js';
import CursorDispensing from './CursorDispensing.js';
import CursorHistory from './CursorHistory.js';
import type { CursorUpdate, SpaceMember } from './types.js';

import type { RealtimeMessage } from './utilities/types.js';

interface CursorsTestContext {
  client: Types.RealtimePromise;
  space: Space;
  cursors: Cursors;
  channel: Types.RealtimeChannelPromise;
  batching: CursorBatching;
  dispensing: CursorDispensing;
  history: CursorHistory;
  selfStub: SpaceMember;
  lastCursorPositionsStub: Record<string, CursorUpdate>;
  fakeMessageStub: RealtimeMessage;
}

vi.mock('ably/promises');

function createPresenceCount(length: number) {
  return async () => Array.from({ length }, (_, i) => createPresenceMessage('enter', { clientId: '' + i }));
}

describe('Cursors', () => {
  beforeEach<CursorsTestContext>((context) => {
    const client = new Realtime({});
    context.client = client;
    context.space = new Space('test', client);
    context.cursors = context.space.cursors;
    // This will set the channel
    context.cursors.subscribe('cursorsUpdate', () => {});
    context.channel = context.cursors['channel'] as Types.RealtimeChannelPromise;
    context.batching = context.space.cursors['cursorBatching'];
    context.dispensing = context.space.cursors['cursorDispensing'];
    context.history = context.space.cursors['cursorHistory'];
    context.fakeMessageStub = {
      connectionId: 'connectionId',
      clientId: 'clientId',
      data: null,
      encoding: 'encoding',
      extras: null,
      id: '1',
      name: 'fake',
      timestamp: 1,
    };
  });

  describe('get', () => {
    beforeEach<CursorsTestContext>(() => {
      vi.useFakeTimers();
    });

    afterEach<CursorsTestContext>(() => {
      vi.useRealTimers();
    });

    it<CursorsTestContext>('emits a cursorsUpdate event', ({ space, dispensing, batching, fakeMessageStub }) => {
      const fakeMessage = {
        ...fakeMessageStub,
        data: [
          { cursor: { position: { x: 1, y: 1 } } },
          { cursor: { position: { x: 1, y: 2 }, data: { color: 'red' } } },
        ],
      };

      const spy = vitest.fn();
      space.cursors.subscribe(spy);
      dispensing.processBatch(fakeMessage);

      vi.advanceTimersByTime(batching.batchTime * 2);

      expect(spy).toHaveBeenCalledWith({
        position: { x: 1, y: 1 },
        data: undefined,
        clientId: 'clientId',
        connectionId: 'connectionId',
      });

      vi.advanceTimersByTime(batching.batchTime * 2);

      expect(spy).toHaveBeenCalledWith({
        position: { x: 1, y: 2 },
        data: { color: 'red' },
        clientId: 'clientId',
        connectionId: 'connectionId',
      });
    });
  });

  describe('CursorBatching', () => {
    it<CursorsTestContext>('shouldSend is set to false when there is one client present', async ({
      channel,
      cursors,
      batching,
    }) => {
      vi.spyOn(channel.presence, 'get').mockImplementation(createPresenceCount(1));
      await cursors['onPresenceUpdate']();
      expect(batching.shouldSend).toBeFalsy();
    });

    it<CursorsTestContext>('shouldSend is set to true when there is more than one client present', async ({
      channel,
      cursors,
      batching,
    }) => {
      vi.spyOn(channel.presence, 'get').mockImplementation(createPresenceCount(2));
      await cursors['onPresenceUpdate']();
      expect(batching.shouldSend).toBeTruthy();
      expect(batching.batchTime).toEqual(100);
    });

    it<CursorsTestContext>('batchTime is updated when multiple people are present', async ({
      channel,
      cursors,
      batching,
    }) => {
      vi.spyOn(channel.presence, 'get').mockImplementation(createPresenceCount(2));
      await cursors['onPresenceUpdate']();
      expect(batching.batchTime).toEqual(100);
    });

    describe('pushCursorPosition', () => {
      beforeEach<CursorsTestContext>((context) => {
        const batching = context.batching as any;
        // Set isRunning to true to avoid starting the loop here
        batching.isRunning = true;
        batching.shouldSend = true;
      });

      it<CursorsTestContext>('should ignore cursor updates if shouldSend is false', (context) => {
        const batching = context.batching as any;
        batching.shouldSend = false;
        expect(batching.hasMovement).toBeFalsy();
        batching.pushCursorPosition('cursor1', { x: 1, y: 1 });
        expect(batching.hasMovement).toBeFalsy();
      });

      it<CursorsTestContext>('sets hasMovements to true', (context) => {
        const batching = context.batching as any;
        expect(batching.hasMovement).toBeFalsy();
        batching.pushCursorPosition('cursor1', { x: 1, y: 1 });
        expect(batching.hasMovement).toBeTruthy();
      });

      it<CursorsTestContext>('creates an outgoingBuffer for a new cursor movement', ({ batching, channel }) => {
        batching.pushCursorPosition(channel, { position: { x: 1, y: 1 }, data: {} });
        expect(batching.outgoingBuffer).toEqual([{ cursor: { position: { x: 1, y: 1 }, data: {} }, offset: 0 }]);
      });

      it<CursorsTestContext>('adds cursor data to an existing buffer', ({ batching, channel }) => {
        vi.useFakeTimers();
        batching.pushCursorPosition(channel, { position: { x: 1, y: 1 }, data: {} });
        expect(batching.outgoingBuffer).toEqual([{ cursor: { position: { x: 1, y: 1 }, data: {} }, offset: 0 }]);

        vi.advanceTimersByTime(10);
        batching.pushCursorPosition(channel, { position: { x: 2, y: 2 }, data: {} });
        expect(batching.outgoingBuffer).toEqual([
          { cursor: { position: { x: 1, y: 1 }, data: {} }, offset: 0 },
          { cursor: { position: { x: 2, y: 2 }, data: {} }, offset: 10 },
        ]);
      });

      it<CursorsTestContext>('should start batchToChannel correctly', (context) => {
        const batching = context.batching as any;
        batching.isRunning = false;
        batching.batchToChannel = vitest.fn();
        batching.pushCursorPosition('cursor1', { position: { x: 1, y: 1 } });
        batching.pushCursorPosition('cursor1', { position: { x: 1, y: 1 } });
        expect(batching.batchToChannel).toHaveBeenCalledOnce();
        expect(batching.isRunning).toBeTruthy();
      });
    });

    describe('batchToChannel', () => {
      beforeEach<CursorsTestContext>(() => {
        vi.useFakeTimers();
      });

      afterEach<CursorsTestContext>(() => {
        vi.useRealTimers();
      });

      it<CursorsTestContext>('should stop when hasMovement is false', async ({ channel, batching }) => {
        batching.hasMovement = false;
        batching.isRunning = true;
        const spy = vi.spyOn(channel, 'publish');
        await batching['batchToChannel'](channel, CURSOR_UPDATE);
        expect(batching.isRunning).toBeFalsy();
        expect(spy).not.toHaveBeenCalled();
      });

      it<CursorsTestContext>('should publish the cursor buffer', async ({ batching, channel }) => {
        batching.hasMovement = true;
        batching.outgoingBuffer = [{ cursor: { position: { x: 1, y: 1 }, data: {} }, offset: 0 }];
        const spy = vi.spyOn(channel, 'publish');
        await batching['batchToChannel'](channel, CURSOR_UPDATE);
        expect(spy).toHaveBeenCalledWith(CURSOR_UPDATE, [
          { cursor: { position: { x: 1, y: 1 }, data: {} }, offset: 0 },
        ]);
      });

      it<CursorsTestContext>('should clear the buffer', async ({ batching, channel }) => {
        batching.hasMovement = true;
        batching.outgoingBuffer = [{ cursor: { position: { x: 1, y: 1 }, data: {} }, offset: 0 }];
        await batching['batchToChannel'](channel, CURSOR_UPDATE);
        expect(batching.outgoingBuffer).toEqual([]);
      });

      it<CursorsTestContext>('should set hasMovements to false', async ({ batching, channel }) => {
        batching.hasMovement = true;
        await batching['batchToChannel'](channel, CURSOR_UPDATE);
        expect(batching.hasMovement).toBeFalsy();
      });
    });
  });

  describe('CursorDispensing', () => {
    describe('processBatch', () => {
      it<CursorsTestContext>('does not call emitFromBatch if there are no updates', async ({
        dispensing,
        fakeMessageStub,
      }) => {
        const spy = vi.spyOn(dispensing, 'emitFromBatch');

        const fakeMessage = {
          ...fakeMessageStub,
          data: [],
        };

        dispensing.processBatch(fakeMessage);
        expect(spy).not.toHaveBeenCalled();
      });

      it<CursorsTestContext>('call emitFromBatch if there are updates', async ({ dispensing, fakeMessageStub }) => {
        const spy = vi.spyOn(dispensing, 'emitFromBatch');

        const fakeMessage = {
          ...fakeMessageStub,
          data: [{ cursor: { position: { x: 1, y: 1 } } }],
        };

        dispensing.processBatch(fakeMessage);
        expect(spy).toHaveBeenCalled();
      });

      it<CursorsTestContext>('puts a message into the buffer in the correct format', async ({
        dispensing,
        fakeMessageStub,
      }) => {
        const fakeMessage = {
          ...fakeMessageStub,
          data: [
            { cursor: { position: { x: 1, y: 1 } }, offset: 10 },
            { cursor: { position: { x: 2, y: 3 }, data: { color: 'blue' } }, offset: 20 },
            { cursor: { position: { x: 5, y: 4 } }, offset: 30 },
          ],
        };
        vi.useFakeTimers();

        const spy = vi.spyOn(dispensing, 'setEmitCursorUpdate');
        dispensing.processBatch(fakeMessage);

        vi.advanceTimersByTime(10);
        expect(spy).toHaveBeenCalledWith({
          position: { x: 1, y: 1 },
          data: undefined,
          clientId: 'clientId',
          connectionId: 'connectionId',
        });

        vi.advanceTimersByTime(10);
        expect(spy).toHaveBeenCalledWith({
          position: { x: 2, y: 3 },
          data: { color: 'blue' },
          clientId: 'clientId',
          connectionId: 'connectionId',
        });

        vi.advanceTimersByTime(10);
        expect(spy).toHaveBeenCalledWith({
          position: { x: 5, y: 4 },
          data: undefined,
          clientId: 'clientId',
          connectionId: 'connectionId',
        });
        expect(spy).toHaveBeenCalledTimes(3);
      });

      it<CursorsTestContext>('runs until the batch is empty', async ({ dispensing, fakeMessageStub }) => {
        vi.useFakeTimers();

        const fakeMessage = {
          ...fakeMessageStub,
          data: [
            { cursor: { position: { x: 1, y: 1 } }, offset: 10 },
            { cursor: { position: { x: 2, y: 3 }, data: { color: 'blue' } }, offset: 20 },
            { cursor: { position: { x: 5, y: 4 } }, offset: 30 },
          ],
        };

        const spy = vi.spyOn(dispensing, 'setEmitCursorUpdate');

        expect(dispensing.bufferHaveData()).toBe(false);

        dispensing.processBatch(fakeMessage);
        expect(spy).toHaveBeenCalledTimes(0);

        vi.advanceTimersByTime(10);
        expect(spy).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(10);
        expect(spy).toHaveBeenCalledTimes(2);

        vi.advanceTimersByTime(10);
        expect(spy).toHaveBeenCalledTimes(3);

        expect(dispensing.bufferHaveData()).toBe(false);

        vi.useRealTimers();
      });
    });
  });

  describe('CursorHistory', () => {
    beforeEach<CursorsTestContext>((context) => {
      context.selfStub = {
        connectionId: 'connectionId1',
        clientId: 'clientId1',
        isConnected: true,
        profileData: {},
        location: {},
        lastEvent: { name: 'enter', timestamp: 0 },
      };

      context.lastCursorPositionsStub = {
        connectionId1: {
          connectionId: 'connectionId1',
          clientId: 'clientId1',
          data: {
            color: 'blue',
          },
          position: {
            x: 2,
            y: 3,
          },
        },
        connectionId2: {
          connectionId: 'connectionId2',
          clientId: 'clientId2',
          data: undefined,
          position: {
            x: 25,
            y: 44,
          },
        },
        connectionId3: {
          connectionId: 'connectionId3',
          clientId: 'clientId3',
          data: undefined,
          position: {
            x: 225,
            y: 244,
          },
        },
      };
    });

    it<CursorsTestContext>('returns an empty object if there is no members in the space', async ({
      space,
      channel,
    }) => {
      vi.spyOn(channel.presence, 'get').mockImplementation(createPresenceCount(0));
      expect(await space.cursors.getAll()).toEqual({});
    });

    it<CursorsTestContext>('gets the last position from all connected clients', async ({ space, channel }) => {
      const client1Message = {
        connectionId: 'connectionId1',
        clientId: 'clientId1',
        data: [{ position: { x: 1, y: 1 } }, { position: { x: 2, y: 3 }, data: { color: 'blue' } }],
      };

      const client2Message = {
        connectionId: 'connectionId2',
        clientId: 'clientId2',
        data: [{ position: { x: 25, y: 44 } }],
      };

      vi.spyOn(channel.presence, 'get').mockImplementation(async () => [
        createPresenceMessage('enter', { connectionId: 'connectionId1' }),
        createPresenceMessage('enter', { connectionId: 'connectionId2' }),
      ]);

      const page = await channel.history();
      vi.spyOn(page, 'current').mockImplementationOnce(async () => {
        return {
          ...channel.history(),
          items: [client1Message, client2Message],
        };
      });

      expect(await space.cursors.getAll()).toEqual({
        connectionId1: {
          connectionId: 'connectionId1',
          clientId: 'clientId1',
          data: {
            color: 'blue',
          },
          position: {
            x: 2,
            y: 3,
          },
        },

        connectionId2: {
          connectionId: 'connectionId2',
          clientId: 'clientId2',
          data: undefined,
          position: {
            x: 25,
            y: 44,
          },
        },
      });
    });

    it<CursorsTestContext>('calls the history API up to the paginationLimit', async ({ space, channel, cursors }) => {
      vi.spyOn(channel.presence, 'get').mockImplementation(async () => [
        createPresenceMessage('enter', { connectionId: 'connectionId1' }),
        createPresenceMessage('enter', { connectionId: 'connectionId2' }),
      ]);

      const page = await channel.history();
      const currentSpy = vi.spyOn(page, 'current');
      const nextSpy = vi.spyOn(page, 'next');

      vi.spyOn(page, 'hasNext').mockImplementation(() => true);

      await space.cursors.getAll();
      expect(currentSpy).toHaveBeenCalledOnce();
      expect(nextSpy).toHaveBeenCalledTimes(cursors.options.paginationLimit - 1);
    });

    it<CursorsTestContext>('returns undefined if self is not present in cursors', async ({ space }) => {
      vi.spyOn(space.cursors, 'getAll').mockImplementation(async () => ({}));

      const self = await space.cursors.getSelf();
      expect(self).toBeUndefined();
    });

    it<CursorsTestContext>('returns the cursor update for self', async ({
      space,
      lastCursorPositionsStub,
      selfStub,
    }) => {
      vi.spyOn(space.cursors, 'getAll').mockImplementation(async () => lastCursorPositionsStub);
      vi.spyOn(space.members, 'getSelf').mockReturnValue(selfStub);

      const selfCursor = await space.cursors.getSelf();
      expect(selfCursor).toEqual(lastCursorPositionsStub['connectionId1']);
    });

    it<CursorsTestContext>('returns an empty object if self is not present in cursors', async ({ space }) => {
      vi.spyOn(space.cursors, 'getAll').mockResolvedValue({});
      vi.spyOn(space.members, 'getSelf').mockReturnValue(undefined);

      const others = await space.cursors.getOthers();
      expect(others).toEqual({});
    });

    it<CursorsTestContext>('returns an empty object if there are no other cursors', async ({ space, selfStub }) => {
      const onlyMyCursor = {
        connectionId1: {
          connectionId: 'connectionId1',
          clientId: 'clientId1',
          data: {
            color: 'blue',
          },
          position: {
            x: 2,
            y: 3,
          },
          offset: 0,
        },
      };

      vi.spyOn(space.cursors, 'getAll').mockResolvedValue(onlyMyCursor);
      vi.spyOn(space.members, 'getSelf').mockReturnValue(selfStub);

      const others = await space.cursors.getOthers();
      expect(others).toEqual({});
    });

    it<CursorsTestContext>('returns an object of other cursors', async ({
      space,
      selfStub,
      lastCursorPositionsStub,
    }) => {
      vi.spyOn(space.cursors, 'getAll').mockResolvedValue(lastCursorPositionsStub);
      vi.spyOn(space.members, 'getSelf').mockReturnValue(selfStub);

      const others = await space.cursors.getOthers();
      expect(others).toEqual({
        connectionId2: {
          connectionId: 'connectionId2',
          clientId: 'clientId2',
          position: {
            x: 25,
            y: 44,
          },
          data: undefined,
        },
        connectionId3: {
          connectionId: 'connectionId3',
          clientId: 'clientId3',
          position: {
            x: 225,
            y: 244,
          },
          data: undefined,
        },
      });
    });
  });
});
