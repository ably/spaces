import { it, describe, expect, vi, beforeEach } from 'vitest';
import { Realtime, Types } from 'ably/promises';

import Space from './Space.js';
import type { SpaceMember } from './types.js';
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
    // presenceMap including an entry for the client's connectionId, and also
    // include some members with connectionIds which sort before and after for
    // testing lock invalidation
    vi.spyOn(presence, 'get').mockImplementationOnce(async () => [
      createPresenceMessage('enter', { connectionId: '1' }),
      createPresenceMessage('enter', { connectionId: '0' }),
      createPresenceMessage('enter', { connectionId: '2' }),
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

  describe('processPresenceMessage', () => {
    const lockID = 'test';

    const lockEvent = (member: SpaceMember, status: LockStatus) =>
      expect.objectContaining({
        member: member,
        request: expect.objectContaining({ id: lockID, status }),
      });

    it<SpaceTestContext>('sets a PENDING request to LOCKED', async ({ space }) => {
      await space.enter();
      const member = space.members.getSelf()!;

      const emitSpy = vi.spyOn(space.locks, 'emit');

      const msg = Realtime.PresenceMessage.fromValues({
        connectionId: member.connectionId,
        extras: {
          locks: [
            {
              id: lockID,
              status: LockStatus.PENDING,
              timestamp: Date.now(),
            },
          ],
        },
      });
      space.locks.processPresenceMessage(msg);

      const lock = member.locks.get(lockID)!;
      expect(lock.status).toBe(LockStatus.LOCKED);
      expect(emitSpy).toHaveBeenCalledWith('update', lockEvent(member, LockStatus.LOCKED));
    });

    // use table driven tests to check whether a PENDING request for "self"
    // (i.e. the current member) transitions to LOCKED or UNLOCKED when the
    // referenced lock is already held by some other member with timestamp
    // and/or connectionId before/after the current member's request.
    const now = Date.now();
    describe.each([
      {
        name: 'when the other member has the lock with an earlier timestamp',
        desc: 'assigns the lock to the other member',
        otherConnId: '0',
        otherTimestamp: now - 100,
        expectedSelfStatus: LockStatus.UNLOCKED,
        expectedOtherStatus: LockStatus.LOCKED,
      },
      {
        name: 'when the other member has the lock with the same timestamp but a lower connectionId',
        desc: 'assigns the lock to the other member',
        otherConnId: '0',
        otherTimestamp: now,
        expectedSelfStatus: LockStatus.UNLOCKED,
        expectedOtherStatus: LockStatus.LOCKED,
      },
      {
        name: 'when the other member has the lock with the same timestamp but a higher connectionId',
        desc: 'assigns the lock to self',
        otherConnId: '2',
        otherTimestamp: now,
        expectedSelfStatus: LockStatus.LOCKED,
        expectedOtherStatus: LockStatus.UNLOCKED,
      },
      {
        name: 'when the other member has the lock with a later timestamp',
        desc: 'assigns the lock to self',
        otherConnId: '0',
        otherTimestamp: now + 100,
        expectedSelfStatus: LockStatus.LOCKED,
        expectedOtherStatus: LockStatus.UNLOCKED,
      },
    ])('$name', ({ desc, otherConnId, otherTimestamp, expectedSelfStatus, expectedOtherStatus }) => {
      it<SpaceTestContext>(desc, async ({ client, space }) => {
        await space.enter();

        // process a PENDING request for the other member, which should
        // transition to LOCKED
        let msg = Realtime.PresenceMessage.fromValues({
          connectionId: otherConnId,
          extras: {
            locks: [
              {
                id: lockID,
                status: LockStatus.PENDING,
                timestamp: otherTimestamp,
              },
            ],
          },
        });
        space.locks.processPresenceMessage(msg);
        const lock = space.locks.get(lockID)!;
        expect(lock.member.connectionId).toBe(otherConnId);

        // process a PENDING request for the current member and check the
        // result matches what is expected
        const emitSpy = vi.spyOn(space.locks, 'emit');
        msg = Realtime.PresenceMessage.fromValues({
          connectionId: client.connection.id,
          extras: {
            locks: [
              {
                id: lockID,
                status: LockStatus.PENDING,
                timestamp: now,
              },
            ],
          },
        });
        space.locks.processPresenceMessage(msg);
        const selfMember = space.members.getByConnectionId(client.connection.id!)!;
        const selfLock = selfMember.locks.get(lockID)!;
        expect(selfLock.status).toBe(expectedSelfStatus);
        const otherMember = space.members.getByConnectionId(otherConnId)!;
        const otherLock = otherMember.locks.get(lockID)!;
        expect(otherLock.status).toBe(expectedOtherStatus);

        if (expectedSelfStatus === LockStatus.UNLOCKED) {
          expect(emitSpy).toHaveBeenCalledTimes(1);
          expect(emitSpy).toHaveBeenNthCalledWith(1, 'update', lockEvent(selfMember, LockStatus.UNLOCKED));
        } else {
          expect(emitSpy).toHaveBeenCalledTimes(2);
          expect(emitSpy).toHaveBeenNthCalledWith(1, 'update', lockEvent(otherMember, LockStatus.UNLOCKED));
          expect(emitSpy).toHaveBeenNthCalledWith(2, 'update', lockEvent(selfMember, LockStatus.LOCKED));
        }
      });
    });
  });
});
