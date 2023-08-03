import { it, describe, expect, vi, beforeEach } from 'vitest';
import { Realtime, Types } from 'ably/promises';

import Space from './Space.js';
import { LockStatus } from './Locks.js';
import { createPresenceMessage } from './utilities/test/fakes.js';

interface SpaceTestContext {
  client: Types.RealtimePromise;
  space: Space;
  presence: Types.RealtimePresencePromise;
}

vi.mock('ably/promises');

describe('Locks (mockClient)', () => {
  beforeEach<SpaceTestContext>((context) => {
    const client = new Realtime({});
    const presence = client.channels.get('').presence;

    // support entering the space, which requires presence.get() to return a
    // presenceMap including an entry for the client's connectionId.
    vi.spyOn(presence, 'get').mockImplementationOnce(async () => [
      createPresenceMessage('enter', { connectionId: '1' }),
    ]);

    context.client = client;
    context.space = new Space('test', client);
    context.presence = presence;
  });

  describe('acquire', () => {
    it<SpaceTestContext>('errors if acquiring before entering the space', ({ space }) => {
      expect(space.locks.acquire('test')).rejects.toThrowError();
    });

    it<SpaceTestContext>('enters presence with a PENDING lock request for the current member', async ({
      space,
      presence,
    }) => {
      await space.enter();

      const presenceUpdate = vi.spyOn(presence, 'update');

      const lockID = 'test';
      const req = await space.locks.acquire(lockID);
      expect(req.status).toBe(LockStatus.PENDING);

      const presenceMessage = expect.objectContaining({
        extras: {
          locks: [
            expect.objectContaining({
              id: lockID,
              status: LockStatus.PENDING,
            }),
          ],
        },
      });
      expect(presenceUpdate).toHaveBeenCalledWith(presenceMessage);
    });

    it<SpaceTestContext>('includes attributes in the lock request when provided', async ({ space, presence }) => {
      await space.enter();

      const presenceUpdate = vi.spyOn(presence, 'update');

      const lockID = 'test';
      const attributes = new Map();
      attributes.set('key1', 'foo');
      attributes.set('key2', 'bar');
      const req = await space.locks.acquire(lockID, { attributes });
      expect(req.attributes).toBe(attributes);

      const presenceMessage = expect.objectContaining({
        extras: {
          locks: [expect.objectContaining({ attributes })],
        },
      });
      expect(presenceUpdate).toHaveBeenCalledWith(presenceMessage);
    });

    it<SpaceTestContext>('errors if a PENDING request already exists', async ({ space }) => {
      await space.enter();

      const lockID = 'test';
      await space.locks.acquire(lockID);
      expect(space.locks.acquire(lockID)).rejects.toThrowError();
    });
  });
});
