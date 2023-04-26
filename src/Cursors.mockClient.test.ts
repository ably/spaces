import { it, describe, expect, vi, expectTypeOf, beforeEach, vitest, afterEach } from 'vitest';
import { Realtime, Types } from 'ably/promises';
import Space from './Space.js';
import { createPresenceMessage } from './utilities/test/fakes.js';
import Cursor from './Cursor';
import CursorBatching, { CURSOR_POSITION_CHANNEL } from './CursorBatching';

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
      space.cursors.on('positionsUpdate', spy);
      space.cursors['onIncomingCursorMovement'](fakeMessage as Types.Message);
      expect(spy).toHaveBeenCalledWith(fakeMessage.data);
    });

    it<CursorsTestContext>('emits positionUpdate for a specific cursor event', ({ space }) => {
      const fakeMessage = { data: { cursor1: [{ x: 1, y: 1 }] } };
      const spy = vitest.fn();
      space.cursors.get('cursor1').on('positionUpdate', spy);
      space.cursors['onIncomingCursorMovement'](fakeMessage as Types.Message);
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
        expect(batching.has.movement).toBeFalsy();
        batching.pushCursorPosition('cursor1', { x: 1, y: 1 });
        expect(batching.has.movement).toBeFalsy();
      });

      it<CursorsTestContext>('sets has.movements to true', (context) => {
        const batching = context.batching as any;
        expect(batching.has.movement).toBeFalsy();
        batching.pushCursorPosition('cursor1', { x: 1, y: 1 });
        expect(batching.has.movement).toBeTruthy();
      });

      it<CursorsTestContext>('creates an outgoingBuffer for a new cursor movement', (context) => {
        const batching = context.batching as any;
        batching.pushCursorPosition('cursor1', { x: 1, y: 1 });
        expect(batching.outgoingBuffers.movement.cursor1).toEqual([{ x: 1, y: 1 }]);
      });

      it<CursorsTestContext>('adds cursor data to an existing buffer', (context) => {
        const batching = context.batching as any;
        batching.pushCursorPosition('cursor1', { x: 1, y: 1 });
        expect(batching.outgoingBuffers.movement.cursor1).toEqual([{ x: 1, y: 1 }]);
        batching.pushCursorPosition('cursor1', { x: 2, y: 2 });
        expect(batching.outgoingBuffers.movement.cursor1).toEqual([
          { x: 1, y: 1 },
          { x: 2, y: 2 },
        ]);
      });

      it<CursorsTestContext>('should start batchToChannel correctly', (context) => {
        const batching = context.batching as any;
        batching.isRunning = false;
        batching.batchToChannel = vitest.fn();
        batching.pushCursorPosition('cursor1', { x: 1, y: 1 });
        batching.pushCursorPosition('cursor1', { x: 1, y: 1 });
        expect(batching.batchToChannel).toHaveBeenCalledOnce();
        expect(batching.isRunning).toBeTruthy();
      });
    });

    describe('pushCursorData', () => {
      beforeEach<CursorsTestContext>((context) => {
        const batching = context.batching as any;
        // Set isRunning to true to avoid starting the loop here
        batching.isRunning = true;
        batching.shouldSend = true;
      });

      it<CursorsTestContext>('should ignore cursor updates if shouldSend is false', (context) => {
        const batching = context.batching as any;
        batching.shouldSend = false;
        expect(batching.has.data).toBeFalsy();
        batching.pushCursorData('cursor1', { color: 'red' });
        expect(batching.has.data).toBeFalsy();
      });

      it<CursorsTestContext>('sets has.movements to true', (context) => {
        const batching = context.batching as any;
        expect(batching.has.data).toBeFalsy();
        batching.pushCursorData('cursor1', { color: 'red' });
        expect(batching.has.data).toBeTruthy();
      });

      it<CursorsTestContext>('creates an outgoingBuffer for a new cursor movement', (context) => {
        const batching = context.batching as any;
        batching.pushCursorData('cursor1', { color: 'red' });
        expect(batching.outgoingBuffers.data.cursor1).toEqual([{ color: 'red' }]);
      });

      it<CursorsTestContext>('adds cursor data to an existing buffer', (context) => {
        const batching = context.batching as any;
        batching.pushCursorData('cursor1', { color: 'red' });
        expect(batching.outgoingBuffers.data.cursor1).toEqual([{ color: 'red' }]);
        batching.pushCursorData('cursor1', { color: 'green' });
        expect(batching.outgoingBuffers.data.cursor1).toEqual([{ color: 'red' }, { color: 'green' }]);
      });

      it<CursorsTestContext>('should start batchToChannel correctly', (context) => {
        const batching = context.batching as any;
        batching.isRunning = false;
        batching.batchToChannel = vitest.fn();
        batching.pushCursorData('cursor1', { color: 'red' });
        batching.pushCursorData('cursor1', { color: 'green' });
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

      it<CursorsTestContext>('should stop when has.movement is false', async (context) => {
        const space = context.space;
        const batching = context.batching as any;
        batching.has.movement = false;
        batching.isRunning = true;
        const spy = vi.spyOn(space.cursors['channel'], 'publish');
        await batching.batchToChannel('movement', CURSOR_POSITION_CHANNEL);
        expect(batching.isRunning).toBeFalsy();
        expect(spy).not.toHaveBeenCalled();
      });

      it<CursorsTestContext>('should publish the cursor buffer', async (context) => {
        const space = context.space;
        const batching = context.batching as any;
        batching.has.movement = true;
        batching.outgoingBuffers.movement = { cursor1: [{ x: 1, y: 1 }] };
        const spy = vi.spyOn(space.cursors['channel'], 'publish');
        await batching.batchToChannel('movement', CURSOR_POSITION_CHANNEL);
        expect(spy).toHaveBeenCalledWith(CURSOR_POSITION_CHANNEL, { cursor1: [{ x: 1, y: 1 }] });
      });

      it<CursorsTestContext>('should clear the buffer', async (context) => {
        const batching = context.batching as any;
        batching.has.movement = true;
        batching.outgoingBuffers.movement = { cursor1: [{ x: 1, y: 1 }] };
        await batching.batchToChannel('movement', CURSOR_POSITION_CHANNEL);
        expect(batching.outgoingBuffers.movement).toEqual({});
      });

      it<CursorsTestContext>('should set has.movements to false', async (context) => {
        const batching = context.batching as any;
        batching.has.movement = true;
        await batching.batchToChannel('movement', CURSOR_POSITION_CHANNEL);
        expect(batching.has.movement).toBeFalsy();
      });
    });
  });
});

function createPresenceCount(length: number) {
  return async () => Array.from({ length }, (_, i) => createPresenceMessage('enter', { clientId: '' + i }));
}
