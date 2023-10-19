import { it, describe, expect, vi, beforeEach } from 'vitest';
import { Realtime, Types } from 'ably/promises';

import Space from './Space.js';
import type { SpaceMember, LockStatus } from './types.js';
import { createPresenceMessage } from './utilities/test/fakes.js';

interface SpaceTestContext {
  client: Types.RealtimePromise;
  space: Space;
  presence: Types.RealtimePresencePromise;
  presenceMap: Map<string, Types.PresenceMessage>;
}

vi.mock('ably/promises');

describe('Locks', () => {
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
      const presenceUpdate = vi.spyOn(presence, 'update');

      const lockID = 'test';
      const attributes = { key1: 'foo', key2: 'bar' };
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
        id: lockID,
        status,
      });

    it<SpaceTestContext>('sets a PENDING request to LOCKED', async ({ space }) => {
      const member = (await space.members.getSelf())!;

      const emitSpy = vi.spyOn(space.locks, 'emit');

      const msg = Realtime.PresenceMessage.fromValues({
        action: 'update',
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

      const lock = space.locks.getLock(lockID, member.connectionId)!;
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
        expectedSelfStatus: undefined,
        expectedOtherStatus: 'locked',
      },
      {
        name: 'when the other member has the lock with the same timestamp but a lower connectionId',
        desc: 'assigns the lock to the other member',
        otherConnId: '0',
        otherTimestamp: now,
        expectedSelfStatus: undefined,
        expectedOtherStatus: 'locked',
      },
      {
        name: 'when the other member has the lock with the same timestamp but a higher connectionId',
        desc: 'assigns the lock to self',
        otherConnId: '2',
        otherTimestamp: now,
        expectedSelfStatus: 'locked',
        expectedOtherStatus: undefined,
      },
      {
        name: 'when the other member has the lock with a later timestamp',
        desc: 'assigns the lock to self',
        otherConnId: '0',
        otherTimestamp: now + 100,
        expectedSelfStatus: 'locked',
        expectedOtherStatus: undefined,
      },
    ])('$name', ({ desc, otherConnId, otherTimestamp, expectedSelfStatus, expectedOtherStatus }) => {
      it<SpaceTestContext>(desc, async ({ client, space }) => {
        // process a PENDING request for the other member, which should
        // transition to LOCKED
        let msg = Realtime.PresenceMessage.fromValues({
          action: 'update',
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
          action: 'update',
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
        const selfLock = space.locks.getLock(lockID, selfMember.connectionId)!;
        expect(selfLock?.status).toBe(expectedSelfStatus);
        const otherMember = (await space.members.getByConnectionId(otherConnId))!;
        const otherLock = space.locks.getLock(lockID, otherMember.connectionId)!;
        expect(otherLock?.status).toBe(expectedOtherStatus);

        if (!expectedSelfStatus) {
          expect(emitSpy).toHaveBeenCalledTimes(1);
          expect(emitSpy).toHaveBeenNthCalledWith(1, 'update', lockEvent(selfMember, 'unlocked'));
        } else {
          expect(emitSpy).toHaveBeenCalledTimes(2);
          expect(emitSpy).toHaveBeenNthCalledWith(1, 'update', lockEvent(otherMember, 'unlocked'));
          expect(emitSpy).toHaveBeenNthCalledWith(2, 'update', lockEvent(selfMember, 'locked'));
        }
      });
    });

    it<SpaceTestContext>('sets a released request to UNLOCKED', async ({ space }) => {
      const member = (await space.members.getSelf())!;

      let msg = Realtime.PresenceMessage.fromValues({
        action: 'update',
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

      const emitSpy = vi.spyOn(space.locks, 'emit');

      msg = Realtime.PresenceMessage.fromValues({
        action: 'update',
        connectionId: member.connectionId,
        extras: undefined,
      });
      await space.locks.processPresenceMessage(msg);

      const lock = space.locks.getLock(lockID, member.connectionId);
      expect(lock).not.toBeDefined();
      expect(emitSpy).toHaveBeenCalledWith('update', lockEvent(member, 'unlocked'));
    });

    it<SpaceTestContext>('sets all locks to UNLOCKED when a member leaves', async ({ space }) => {
      const member = (await space.members.getSelf())!;

      let msg = Realtime.PresenceMessage.fromValues({
        action: 'update',
        connectionId: member.connectionId,
        extras: {
          locks: [
            {
              id: 'lock1',
              status: 'pending',
              timestamp: Date.now(),
            },
            {
              id: 'lock2',
              status: 'pending',
              timestamp: Date.now(),
            },
          ],
        },
      });
      await space.locks.processPresenceMessage(msg);
      let lock1 = space.locks.get('lock1');
      expect(lock1).toBeDefined();
      expect(lock1!.member).toEqual(member);
      let lock2 = space.locks.get('lock2');
      expect(lock2).toBeDefined();
      expect(lock2!.member).toEqual(member);

      msg.action = 'leave';
      await space.locks.processPresenceMessage(msg);

      lock1 = space.locks.get('lock1');
      expect(lock1).not.toBeDefined();
      lock2 = space.locks.get('lock2');
      expect(lock2).not.toBeDefined();
    });
  });

  describe('release', () => {
    it<SpaceTestContext>('errors if releasing before entering the space', ({ space, presence }) => {
      // override presence.get() so the current member is not in presence
      vi.spyOn(presence, 'get').mockImplementation(async () => []);

      expect(space.locks.release('test')).rejects.toThrowError();
    });

    it<SpaceTestContext>('removes the identified lock request from presence extras', async ({ space, presence }) => {
      const member = (await space.members.getSelf())!;

      const lockID = 'test';
      const timestamp = Date.now();
      const msg = Realtime.PresenceMessage.fromValues({
        connectionId: member.connectionId,
        extras: {
          locks: [
            {
              id: lockID,
              status: 'pending',
              timestamp,
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
      expect(updateMsg.extras).toEqual({ locks: [{ id: lockID, member, timestamp, status: 'unlocked' }] });
    });
  });

  describe('get*', () => {
    beforeEach<SpaceTestContext>(async ({ space }) => {
      await space.locks.processPresenceMessage(
        Realtime.PresenceMessage.fromValues({
          action: 'update',
          connectionId: '1',
          extras: {
            locks: [
              {
                id: 'lock1',
                status: 'pending',
                timestamp: Date.now(),
              },
              {
                id: 'lock2',
                status: 'pending',
                timestamp: Date.now(),
              },
            ],
          },
        }),
      );

      await space.locks.processPresenceMessage(
        Realtime.PresenceMessage.fromValues({
          action: 'update',
          connectionId: '2',
          extras: {
            locks: [
              {
                id: 'lock3',
                status: 'pending',
                timestamp: Date.now(),
              },
            ],
          },
        }),
      );
    });

    it<SpaceTestContext>('correctly sets up locks', ({ space }) => {
      const lock1 = space.locks.get('lock1');
      expect(lock1).toBeDefined();

      const lock2 = space.locks.get('lock2');
      expect(lock2).toBeDefined();

      const lock3 = space.locks.get('lock3');
      expect(lock3).toBeDefined();
    });

    describe('getSelf', () => {
      it<SpaceTestContext>('returns all locks in the LOCKED state that belong to self', async ({ space }) => {
        const member1 = await space.members.getByConnectionId('1')!;

        const locks = await space.locks.getSelf();
        expect(locks.length).toEqual(2);

        for (const lock of locks) {
          switch (lock.id) {
            case 'lock1':
            case 'lock2':
              expect(lock.member).toEqual(member1);
              break;
            default:
              throw new Error(`unexpected lock id: ${lock.id}`);
          }
        }
      });
    });

    describe('getOthers', () => {
      it<SpaceTestContext>('returns all locks in the LOCKED state for every member but self', async ({ space }) => {
        const member2 = await space.members.getByConnectionId('2')!;

        const locks = await space.locks.getOthers();
        expect(locks.length).toEqual(1);

        for (const lock of locks) {
          switch (lock.id) {
            case 'lock3':
              expect(lock.member).toEqual(member2);
              break;
            default:
              throw new Error(`unexpected lock id: ${lock.id}`);
          }
        }
      });
    });

    describe('getAll', () => {
      it<SpaceTestContext>('returns all locks in the LOCKED state', async ({ space }) => {
        const member1 = await space.members.getByConnectionId('1')!;
        const member2 = await space.members.getByConnectionId('2')!;

        const locks = await space.locks.getAll();
        expect(locks.length).toEqual(3);
        for (const lock of locks) {
          switch (lock.id) {
            case 'lock1':
            case 'lock2':
              expect(lock.member).toEqual(member1);
              break;
            case 'lock3':
              expect(lock.member).toEqual(member2);
              break;
            default:
              throw new Error(`unexpected lock id: ${lock.id}`);
          }
        }
      });
    });
  });
});
