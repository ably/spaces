import { it, describe, expect, vi, beforeEach } from 'vitest';
import { Realtime, Types } from 'ably/promises';

import Space from './Space.js';
import type { SpaceMember, LockStatus } from './types.js';
import { LockAttributes } from './Locks.js';
import { createPresenceMessage } from './utilities/test/fakes.js';

interface SpaceTestContext {
  client: Types.RealtimePromise;
  space: Space;
  presence: Types.RealtimePresencePromise;
  presenceMap: Map<string, Types.PresenceMessage>;
}

vi.mock('ably/promises');

describe('Locks (mockClient)', () => {
  beforeEach<SpaceTestContext>((context) => {
    const client = new Realtime({});
    const presence = client.channels.get('').presence;
    const presenceMap = new Map();

    // support entering the space, which requires presence.get() to return a
    // presenceMap including an entry for the client's connectionId, and also
    // include some members with connectionIds which sort before and after for
    // testing lock invalidation
    vi.spyOn(presence, 'get').mockImplementation(async () => {
      return Array.from(presenceMap.values());
    });
    presenceMap.set('1', createPresenceMessage('enter', { connectionId: '1' }));
    presenceMap.set('0', createPresenceMessage('enter', { connectionId: '0' }));
    presenceMap.set('2', createPresenceMessage('enter', { connectionId: '2' }));

    context.client = client;
    context.space = new Space('test', client);
    context.presence = presence;
    context.presenceMap = presenceMap;
  });

  describe('acquire', () => {
    it<SpaceTestContext>('errors if acquiring before entering the space', ({ space, presence }) => {
      // override presence.get() so the current member is not in presence
      vi.spyOn(presence, 'get').mockImplementation(async () => []);

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
      expect(req.status).toBe('pending');

      const presenceMessage = expect.objectContaining({
        extras: {
          locks: [
            expect.objectContaining({
              id: lockID,
              status: 'pending',
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
      const attributes = new LockAttributes();
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
      const member = (await space.members.getSelf())!;

      const emitSpy = vi.spyOn(space.locks, 'emit');

      const msg = Realtime.PresenceMessage.fromValues({
        connectionId: member.connectionId,
        extras: {
          locks: [
            {
              id: lockID,
              status: 'pending',
              timestamp: Date.now(),
            },
          ],
        },
      });
      await space.locks.processPresenceMessage(msg);

      const lock = space.locks.getLockRequest(lockID, member.connectionId)!;
      expect(lock.status).toBe('locked');
      expect(emitSpy).toHaveBeenCalledWith('update', lockEvent(member, 'locked'));
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
        expectedSelfStatus: 'unlocked',
        expectedOtherStatus: 'locked',
      },
      {
        name: 'when the other member has the lock with the same timestamp but a lower connectionId',
        desc: 'assigns the lock to the other member',
        otherConnId: '0',
        otherTimestamp: now,
        expectedSelfStatus: 'unlocked',
        expectedOtherStatus: 'locked',
      },
      {
        name: 'when the other member has the lock with the same timestamp but a higher connectionId',
        desc: 'assigns the lock to self',
        otherConnId: '2',
        otherTimestamp: now,
        expectedSelfStatus: 'locked',
        expectedOtherStatus: 'unlocked',
      },
      {
        name: 'when the other member has the lock with a later timestamp',
        desc: 'assigns the lock to self',
        otherConnId: '0',
        otherTimestamp: now + 100,
        expectedSelfStatus: 'locked',
        expectedOtherStatus: 'unlocked',
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
                status: 'pending',
                timestamp: otherTimestamp,
              },
            ],
          },
        });
        await space.locks.processPresenceMessage(msg);
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
                status: 'pending',
                timestamp: now,
              },
            ],
          },
        });
        await space.locks.processPresenceMessage(msg);
        const selfMember = (await space.members.getByConnectionId(client.connection.id!))!;
        const selfLock = space.locks.getLockRequest(lockID, selfMember.connectionId)!;
        expect(selfLock.status).toBe(expectedSelfStatus);
        const otherMember = (await space.members.getByConnectionId(otherConnId))!;
        const otherLock = space.locks.getLockRequest(lockID, otherMember.connectionId)!;
        expect(otherLock.status).toBe(expectedOtherStatus);

        if (expectedSelfStatus === 'unlocked') {
          expect(emitSpy).toHaveBeenCalledTimes(1);
          expect(emitSpy).toHaveBeenNthCalledWith(1, 'update', lockEvent(selfMember, 'unlocked'));
        } else {
          expect(emitSpy).toHaveBeenCalledTimes(2);
          expect(emitSpy).toHaveBeenNthCalledWith(1, 'update', lockEvent(otherMember, 'unlocked'));
          expect(emitSpy).toHaveBeenNthCalledWith(2, 'update', lockEvent(selfMember, 'locked'));
        }
      });
    });

    // it<SpaceTestContext>('sets a released request to UNLOCKED', async ({ space }) => {
    //   await space.enter();
    //   const member = (await space.members.getSelf())!;
    //
    //   let msg = Realtime.PresenceMessage.fromValues({
    //     connectionId: member.connectionId,
    //     extras: {
    //       locks: [
    //         {
    //           id: lockID,
    //           status: 'pending',
    //           timestamp: Date.now(),
    //         },
    //       ],
    //     },
    //   });
    //   await space.locks.processPresenceMessage(msg);
    //
    //   const emitSpy = vi.spyOn(space.locks, 'emit');
    //
    //   msg = Realtime.PresenceMessage.fromValues({
    //     connectionId: member.connectionId,
    //     extras: undefined,
    //   });
    //   await space.locks.processPresenceMessage(msg);
    //
    //   const lock = space.locks.getLockRequest(lockID, member.connectionId);
    //   expect(lock).not.toBeDefined();
    //   expect(emitSpy).toHaveBeenCalledWith('update', lockEvent(member, 'unlocked'));
    // });
  });

  describe('release', () => {
    it<SpaceTestContext>('errors if releasing before entering the space', ({ space, presence }) => {
      // override presence.get() so the current member is not in presence
      vi.spyOn(presence, 'get').mockImplementation(async () => []);

      expect(space.locks.release('test')).rejects.toThrowError();
    });

    it<SpaceTestContext>('removes the identified lock request from presence extras', async ({ space, presence }) => {
      await space.enter();
      const member = (await space.members.getSelf())!;

      const lockID = 'test';
      const msg = Realtime.PresenceMessage.fromValues({
        connectionId: member.connectionId,
        extras: {
          locks: [
            {
              id: lockID,
              status: 'pending',
              timestamp: Date.now(),
            },
          ],
        },
      });
      await space.locks.processPresenceMessage(msg);
      expect(space.locks.get(lockID)).toBeDefined();

      const presenceUpdate = vi.spyOn(presence, 'update');

      await space.locks.release(lockID);

      expect(presenceUpdate).toHaveBeenCalledTimes(1);
      const updateMsg = presenceUpdate.mock.calls[0][0];
      expect(updateMsg.extras).not.toBeDefined();
    });
  });
});
