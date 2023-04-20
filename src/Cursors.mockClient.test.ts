import { it, describe, expect, vi, expectTypeOf, beforeEach, vitest } from 'vitest';
import { Realtime, Types } from 'ably/promises';
import Space, { SpaceMember } from './Space.js';
import { createPresenceMessage } from './utilities/test/fakes.js';
import Cursor from './Cursor';
import CursorBatching from './CursorBatching';

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

  describe('cursorBatching', () => {
    it<CursorsTestContext>('shouldSend is set to false when there is one client present', async ({ batching }) => {
      const presence = batching.channel.presence;
      vi.spyOn(presence, 'get').mockImplementation(createPresenceCount(1));
      await batching.onPresenceUpdate({} as Types.PresenceMessage);
      expect(batching.shouldSend).toBeFalsy();
    });

    it<CursorsTestContext>('shouldSend is set to true when there is more than one client present', async ({
      batching,
    }) => {
      vi.spyOn(batching.channel.presence, 'get').mockImplementation(createPresenceCount(2));
      await batching.onPresenceUpdate({} as Types.PresenceMessage);
      expect(batching.shouldSend).toBeTruthy();
      expect(batching.batchTime).toEqual(100);
    });

    it<CursorsTestContext>('batchTime is updated when multiple people are present', async ({ batching }) => {
      vi.spyOn(batching.channel.presence, 'get').mockImplementation(createPresenceCount(2));
      await batching.onPresenceUpdate({} as Types.PresenceMessage);
      expect(batching.batchTime).toEqual(100);
    });

    it<CursorsTestContext>('pushCursorPosition should ignore cursor updates if shouldSend is false', async ({
      batching,
    }) => {
      batching.shouldSend = false;
      expect(batching.hasMovements).toBeFalsy();
      batching.pushCursorPosition('cursor1', { x: 1, y: 1 });
      expect(batching.hasMovements).toBeFalsy();
    });

    it<CursorsTestContext>('pushCursorPosition sets hasMovements to true', async ({ batching }) => {
      // Set isRunning to true to avoid starting the loop here
      batching.isRunning = true;
      batching.shouldSend = true;
      expect(batching.hasMovements).toBeFalsy();
      batching.pushCursorPosition('cursor1', { x: 1, y: 1 });
      expect(batching.hasMovements).toBeTruthy();
    });
  });
});

function createPresenceCount(length: number) {
  return async () => Array.from({ length }, (_, i) => createPresenceMessage('enter', { clientId: '' + i }));
}
