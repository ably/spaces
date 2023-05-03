import { it, describe, expect, vi, expectTypeOf, beforeEach, vitest, afterEach } from 'vitest';
import { Realtime, Types } from 'ably/promises';
import Space from './Space.js';
import { createPresenceMessage } from './utilities/test/fakes.js';
import Cursor from './Cursor';
import CursorBatching from './CursorBatching';
import { CURSOR_UPDATE } from './utilities/Constants.js';

interface CursorsTestContext {
  client: Types.RealtimePromise;
  space: Space;
  batching: CursorBatching;
}

vi.mock('ably/promises');

describe('Cursors (mockClient)', () => {
  beforeEach<CursorsTestContext>((context) => {
    const client = new Realtime({});
    context.client = client;
    context.space = new Space('test', client);
    context.batching = context.space.cursors['cursorBatching'];
  });

  describe('get', () => {
    it<CursorsTestContext>('creates a cursor and returns it', ({ space }) => {
      expectTypeOf(space.cursors.get('cursor1')).toMatchTypeOf<Cursor>();
    });

    it<CursorsTestContext>('returns an existing cursor', ({ space }) => {
      const cursor1 = space.cursors.get('cursor1');
      const cursor2 = space.cursors.get('cursor2');
      expect(cursor1).not.toEqual(cursor2);
      expect(space.cursors.get('cursor1')).toEqual(cursor1);
    });

    it<CursorsTestContext>('emits a positionsUpdate event', ({ space }) => {
      const fakeMessage = { data: { cursor1: [], cursor2: [] } };
      const spy = vitest.fn();
      space.cursors.on('cursorsUpdate', spy);
      space.cursors['onIncomingCursorUpdate'](fakeMessage as Types.Message);
      expect(spy).toHaveBeenCalledWith(fakeMessage.data);
    });

    it<CursorsTestContext>('emits positionUpdate for a specific cursor event', ({ space }) => {
      const fakeMessage = { data: { cursor1: [{ x: 1, y: 1 }] } };
      const spy = vitest.fn();
      space.cursors.get('cursor1').on('cursorUpdate', spy);
      space.cursors['onIncomingCursorUpdate'](fakeMessage as Types.Message);
      expect(spy).toHaveBeenCalledWith(fakeMessage.data.cursor1);
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
});

function createPresenceCount(length: number) {
  return async () => Array.from({ length }, (_, i) => createPresenceMessage('enter', { clientId: '' + i }));
}
