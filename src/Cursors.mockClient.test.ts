import { it, describe, expect, vi, expectTypeOf, beforeEach, vitest, afterEach } from 'vitest';
import { Realtime, Types } from 'ably/promises';
import Space from './Space.js';
import { createPresenceMessage } from './utilities/test/fakes.js';
import Cursor from './Cursor';
import CursorBatching from './CursorBatching';
import { CURSOR_UPDATE } from './utilities/Constants.js';
import CursorDispensing from './CursorDispensing';
import CursorHistory from './CursorHistory';

interface CursorsTestContext {
  client: Types.RealtimePromise;
  space: Space;
  batching: CursorBatching;
  dispensing: CursorDispensing;
  history: CursorHistory;
  fakeMessageStub: Types.Message;
}

vi.mock('ably/promises');

describe('Cursors (mockClient)', () => {
  beforeEach<CursorsTestContext>((context) => {
    const client = new Realtime({});
    context.client = client;
    context.space = new Space('test', client);
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

    it<CursorsTestContext>('creates a cursor and returns it', ({ space }) => {
      expectTypeOf(space.cursors.get('cursor1')).toMatchTypeOf<Cursor>();
    });

    it<CursorsTestContext>('returns an existing cursor', ({ space }) => {
      const cursor1 = space.cursors.get('cursor1');
      const cursor2 = space.cursors.get('cursor2');
      expect(cursor1).not.toEqual(cursor2);
      expect(space.cursors.get('cursor1')).toEqual(cursor1);
    });

    it<CursorsTestContext>('emits a cursorsUpdate event', ({ space, dispensing, batching, fakeMessageStub }) => {
      const fakeMessage = {
        ...fakeMessageStub,
        data: {
          cursor1: [{ position: { x: 1, y: 1 } }],
          cursor2: [{ position: { x: 1, y: 2 }, data: { color: 'red' } }],
        },
      };

      const spy = vitest.fn();
      space.cursors.on(spy);
      dispensing.processBatch(fakeMessage);

      vi.advanceTimersByTime(batching.batchTime * 2);

      expect(spy).toHaveBeenCalledWith({
        position: { x: 1, y: 1 },
        data: undefined,
        clientId: 'clientId',
        connectionId: 'connectionId',
        name: 'cursor1',
      });

      vi.advanceTimersByTime(batching.batchTime * 2);

      expect(spy).toHaveBeenCalledWith({
        position: { x: 1, y: 2 },
        data: { color: 'red' },
        clientId: 'clientId',
        connectionId: 'connectionId',
        name: 'cursor2',
      });
    });

    it<CursorsTestContext>('emits cursorUpdate for a specific cursor event', ({
      space,
      dispensing,
      batching,
      fakeMessageStub,
    }) => {
      const fakeMessage = {
        ...fakeMessageStub,
        data: {
          cursor1: [{ position: { x: 1, y: 1 } }],
          cursor2: [{ position: { x: 1, y: 2 }, data: { color: 'red' } }],
        },
      };

      const spy = vitest.fn();
      const catchAllSpy = vitest.fn();
      space.cursors.on(catchAllSpy);
      space.cursors.get('cursor1').on(spy);
      dispensing.processBatch(fakeMessage);

      vi.advanceTimersByTime(batching.batchTime * 2);

      const result = {
        position: { x: 1, y: 1 },
        data: undefined,
        clientId: 'clientId',
        connectionId: 'connectionId',
        name: 'cursor1',
      };

      expect(spy).toHaveBeenCalledWith(result);
      expect(catchAllSpy).toHaveBeenCalledWith(result);
    });
  });

  describe('CursorBatching', () => {
    it<CursorsTestContext>('shouldSend is set to false when there is one client present', async (context) => {
      const batching = context.batching as any;
      const presence = batching.channel.presence;
      vi.spyOn(presence, 'get').mockImplementation(createPresenceCount(1));
      await batching.onPresenceUpdate();
      expect(batching.shouldSend).toBeFalsy();
    });

    it<CursorsTestContext>('shouldSend is set to true when there is more than one client present', async (context) => {
      const batching = context.batching as any;
      vi.spyOn(batching.channel.presence, 'get').mockImplementation(createPresenceCount(2));
      await batching.onPresenceUpdate();
      expect(batching.shouldSend).toBeTruthy();
      expect(batching.batchTime).toEqual(100);
    });

    it<CursorsTestContext>('batchTime is updated when multiple people are present', async (context) => {
      const batching = context.batching as any;
      vi.spyOn(batching.channel.presence, 'get').mockImplementation(createPresenceCount(2));
      await batching.onPresenceUpdate();
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

      it<CursorsTestContext>('creates an outgoingBuffer for a new cursor movement', (context) => {
        const batching = context.batching as any;
        batching.pushCursorPosition('cursor1', { position: { x: 1, y: 1 }, data: {} });
        expect(batching.outgoingBuffers.cursor1).toEqual([{ position: { x: 1, y: 1 }, data: {} }]);
      });

      it<CursorsTestContext>('adds cursor data to an existing buffer', (context) => {
        const batching = context.batching as any;
        batching.pushCursorPosition('cursor1', { position: { x: 1, y: 1 }, data: {} });
        expect(batching.outgoingBuffers.cursor1).toEqual([{ position: { x: 1, y: 1 }, data: {} }]);
        batching.pushCursorPosition('cursor1', { position: { x: 2, y: 2 }, data: {} });
        expect(batching.outgoingBuffers.cursor1).toEqual([
          { position: { x: 1, y: 1 }, data: {} },
          { position: { x: 2, y: 2 }, data: {} },
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

      it<CursorsTestContext>('should stop when hasMovement is false', async (context) => {
        const space = context.space;
        const batching = context.batching as any;
        batching.hasMovement = false;
        batching.isRunning = true;
        const spy = vi.spyOn(space.cursors['channel'], 'publish');
        await batching.batchToChannel('movement', CURSOR_UPDATE);
        expect(batching.isRunning).toBeFalsy();
        expect(spy).not.toHaveBeenCalled();
      });

      it<CursorsTestContext>('should publish the cursor buffer', async (context) => {
        const space = context.space;
        const batching = context.batching as any;
        batching.hasMovement = true;
        batching.outgoingBuffers = { cursor1: [{ position: { x: 1, y: 1 }, data: {} }] };
        const spy = vi.spyOn(space.cursors['channel'], 'publish');
        await batching.batchToChannel(CURSOR_UPDATE);
        expect(spy).toHaveBeenCalledWith(CURSOR_UPDATE, { cursor1: [{ position: { x: 1, y: 1 }, data: {} }] });
      });

      it<CursorsTestContext>('should clear the buffer', async (context) => {
        const batching = context.batching as any;
        batching.hasMovement = true;
        batching.outgoingBuffers = { cursor1: [{ position: { x: 1, y: 1 }, data: {} }] };
        await batching.batchToChannel(CURSOR_UPDATE);
        expect(batching.outgoingBuffers).toEqual({});
      });

      it<CursorsTestContext>('should set hasMovements to false', async (context) => {
        const batching = context.batching as any;
        batching.hasMovement = true;
        await batching.batchToChannel(CURSOR_UPDATE);
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
          data: {
            cursor1: [],
          },
        };

        dispensing.processBatch(fakeMessage);
        expect(spy).not.toHaveBeenCalled();
      });

      it<CursorsTestContext>('does not call emitFromBatch if the loop is already running', async ({
        dispensing,
        fakeMessageStub,
      }) => {
        const spy = vi.spyOn(dispensing, 'emitFromBatch');

        const fakeMessage = {
          ...fakeMessageStub,
          data: {
            cursor1: [{ position: { x: 1, y: 1 } }],
          },
        };

        dispensing['handlerRunning'] = true;
        dispensing.processBatch(fakeMessage);
        expect(spy).not.toHaveBeenCalled();
      });

      it<CursorsTestContext>('call emitFromBatch if there are updates', async ({ dispensing, fakeMessageStub }) => {
        const spy = vi.spyOn(dispensing, 'emitFromBatch');

        const fakeMessage = {
          ...fakeMessageStub,
          data: {
            cursor1: [{ position: { x: 1, y: 1 } }],
          },
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
          data: {
            cursor1: [{ position: { x: 1, y: 1 } }, { position: { x: 2, y: 3 }, data: { color: 'blue' } }],
            cursor2: [{ position: { x: 5, y: 4 } }],
          },
        };

        dispensing.processBatch(fakeMessage);
        expect(dispensing['buffer']).toEqual({
          connectionId: [
            {
              position: { x: 1, y: 1 },
              data: undefined,
              clientId: 'clientId',
              connectionId: 'connectionId',
              name: 'cursor1',
            },
            {
              position: { x: 2, y: 3 },
              data: { color: 'blue' },
              clientId: 'clientId',
              connectionId: 'connectionId',
              name: 'cursor1',
            },
            {
              position: { x: 5, y: 4 },
              data: undefined,
              clientId: 'clientId',
              connectionId: 'connectionId',
              name: 'cursor2',
            },
          ],
        });
      });

      it<CursorsTestContext>('runs until the batch is empty', async ({ dispensing, batching, fakeMessageStub }) => {
        vi.useFakeTimers();

        const fakeMessage = {
          ...fakeMessageStub,
          data: {
            cursor1: [{ position: { x: 1, y: 1 } }, { position: { x: 2, y: 3 }, data: { color: 'blue' } }],
            cursor2: [{ position: { x: 5, y: 4 } }],
          },
        };

        expect(dispensing['handlerRunning']).toBe(false);
        expect(dispensing.bufferHaveData()).toBe(false);

        dispensing.processBatch(fakeMessage);
        expect(dispensing['buffer']['connectionId']).toHaveLength(3);
        expect(dispensing['handlerRunning']).toBe(true);
        expect(dispensing.bufferHaveData()).toBe(true);
        vi.advanceTimersByTime(batching.batchTime / 2);

        expect(dispensing['buffer']['connectionId']).toHaveLength(2);
        expect(dispensing['handlerRunning']).toBe(true);
        expect(dispensing.bufferHaveData()).toBe(true);

        vi.advanceTimersByTime(batching.batchTime / 2);
        expect(dispensing['buffer']['connectionId']).toHaveLength(1);
        expect(dispensing['handlerRunning']).toBe(true);
        expect(dispensing.bufferHaveData()).toBe(true);

        vi.advanceTimersByTime(batching.batchTime);
        expect(dispensing['buffer']['connectionId']).toHaveLength(0);
        expect(dispensing['handlerRunning']).toBe(false);
        expect(dispensing.bufferHaveData()).toBe(false);

        vi.useRealTimers();
      });
    });
  });

  describe('CursorHistory', () => {
    it<CursorsTestContext>('returns an empty object if there is no members in the space', async ({
      space,
      history,
    }) => {
      vi.spyOn(history['channel']['presence'], 'get').mockImplementation(createPresenceCount(0));
      expect(await space.cursors.getAll()).toEqual({});
    });

    it<CursorsTestContext>('gets the last position of all cursors from all connected clients', async ({
      space,
      history,
    }) => {
      const client1Message = {
        connectionId: 'connectionId1',
        clientId: 'clientId1',
        data: {
          cursor1: [{ position: { x: 1, y: 1 } }, { position: { x: 2, y: 3 }, data: { color: 'blue' } }],
          cursor2: [{ position: { x: 5, y: 4 } }],
        },
      };

      const client2Message = {
        connectionId: 'connectionId2',
        clientId: 'clientId2',
        data: {
          cursor2: [{ position: { x: 25, y: 44 } }],
        },
      };

      vi.spyOn(history['channel']['presence'], 'get').mockImplementation(async () => [
        createPresenceMessage('enter', { connectionId: 'connectionId1' }),
        createPresenceMessage('enter', { connectionId: 'connectionId2' }),
      ]);

      const page = await history['channel'].history();
      vi.spyOn(page, 'current').mockImplementationOnce(async () => {
        return {
          ...history['channel']['history'](),
          items: [client1Message, client2Message],
        };
      });

      expect(await space.cursors.getAll()).toEqual({
        connectionId1: {
          cursor1: {
            connectionId: 'connectionId1',
            clientId: 'clientId1',
            data: {
              color: 'blue',
            },
            name: 'cursor1',
            position: {
              x: 2,
              y: 3,
            },
          },
          cursor2: {
            connectionId: 'connectionId1',
            clientId: 'clientId1',
            data: undefined,
            name: 'cursor2',
            position: {
              x: 5,
              y: 4,
            },
          },
        },
        connectionId2: {
          cursor2: {
            connectionId: 'connectionId2',
            clientId: 'clientId2',
            data: undefined,
            name: 'cursor2',
            position: {
              x: 25,
              y: 44,
            },
          },
        },
      });
    });

    it<CursorsTestContext>('gets the last position of a given cursor from all connected clients', async ({
      space,
      history,
    }) => {
      const client1Message = {
        connectionId: 'connectionId1',
        clientId: 'clientId1',
        data: {
          cursor1: [{ position: { x: 1, y: 1 } }, { position: { x: 2, y: 3 }, data: { color: 'blue' } }],
          cursor2: [{ position: { x: 5, y: 4 } }],
        },
      };

      const client2Message = {
        connectionId: 'connectionId2',
        clientId: 'clientId2',
        data: {
          cursor2: [{ position: { x: 25, y: 44 } }],
        },
      };

      vi.spyOn(history['channel']['presence'], 'get').mockImplementation(async () => [
        createPresenceMessage('enter', { connectionId: 'connectionId1' }),
        createPresenceMessage('enter', { connectionId: 'connectionId2' }),
      ]);

      const page = await history['channel'].history();
      vi.spyOn(page, 'current').mockImplementationOnce(async () => {
        return {
          ...history['channel']['history'](),
          items: [client1Message, client2Message],
        };
      });

      expect(await space.cursors.getAll()).toEqual({
        connectionId1: {
          cursor1: {
            connectionId: 'connectionId1',
            clientId: 'clientId1',
            data: {
              color: 'blue',
            },
            name: 'cursor1',
            position: {
              x: 2,
              y: 3,
            },
          },
          cursor2: {
            connectionId: 'connectionId1',
            clientId: 'clientId1',
            data: undefined,
            name: 'cursor2',
            position: {
              x: 5,
              y: 4,
            },
          },
        },
        connectionId2: {
          cursor2: {
            connectionId: 'connectionId2',
            clientId: 'clientId2',
            data: undefined,
            name: 'cursor2',
            position: {
              x: 25,
              y: 44,
            },
          },
        },
      });
    });

    it<CursorsTestContext>('calls the history API up to the paginationLimit', async ({ space, history }) => {
      vi.spyOn(history['channel']['presence'], 'get').mockImplementation(async () => [
        createPresenceMessage('enter', { connectionId: 'connectionId1' }),
        createPresenceMessage('enter', { connectionId: 'connectionId2' }),
      ]);

      const page = await history['channel'].history();
      const currentSpy = vi.spyOn(page, 'current');
      const nextSpy = vi.spyOn(page, 'next');

      vi.spyOn(page, 'hasNext').mockImplementation(() => true);

      await space.cursors.getAll();
      expect(currentSpy).toHaveBeenCalledOnce();
      expect(nextSpy).toHaveBeenCalledTimes(history.paginationLimit - 1);
    });
  });
});

function createPresenceCount(length: number) {
  return async () => Array.from({ length }, (_, i) => createPresenceMessage('enter', { clientId: '' + i }));
}
