import { it, describe, expect, vi, beforeEach, expectTypeOf, afterEach } from 'vitest';
import { Realtime, Types } from 'ably/promises';

import Space from './Space.js';
import Locations from './Locations.js';
import Cursors from './Cursors.js';

import {
  createPresenceEvent,
  createPresenceMessage,
  createSpaceMember,
  createProfileUpdate,
} from './utilities/test/fakes.js';

interface SpaceTestContext {
  client: Types.RealtimePromise;
  space: Space;
  presence: Types.RealtimePresencePromise;
  presenceMap: Map<string, Types.PresenceMessage>;
}

vi.mock('ably/promises');
vi.mock('nanoid');

describe('Space', () => {
  beforeEach<SpaceTestContext>((context) => {
    const client = new Realtime({});
    const space = new Space('test', client);
    const presence = space.channel.presence;
    const presenceMap = new Map();

    vi.spyOn(presence, 'get').mockImplementation(async () => {
      return Array.from(presenceMap.values());
    });

    context.client = client;
    context.space = space;
    context.presence = presence;
    context.presenceMap = presenceMap;
  });

  describe('get', () => {
    it<SpaceTestContext>('creates a space with the correct name', ({ client }) => {
      const channels = client.channels;
      const channelSpy = vi.spyOn(channels, 'get');
      const space = new Space('test', client);

      expect(channelSpy).toHaveBeenNthCalledWith(1, '_ably_space_test');
      expectTypeOf(space).toMatchTypeOf<Space>();
    });
  });

  describe('enter', () => {
    it<SpaceTestContext>('enter a space successfully', async ({ space, presence }) => {
      const spy = vi.spyOn(presence, 'enter').mockResolvedValueOnce();
      await space.enter({ name: 'Betty' });
      expect(spy).toHaveBeenNthCalledWith(1, createProfileUpdate({ current: { name: 'Betty' } }));
    });

    it<SpaceTestContext>('returns current space members', async ({ presenceMap, space }) => {
      presenceMap.set('1', createPresenceMessage('enter'));
      presenceMap.set('2', createPresenceMessage('update', { clientId: '2', connectionId: '2' }));

      const spaceMembers = await space.enter();

      expect(spaceMembers).toEqual([
        createSpaceMember({ lastEvent: { name: 'enter', timestamp: 1 } }),
        createSpaceMember({ clientId: '2', connectionId: '2', lastEvent: { name: 'update', timestamp: 1 } }),
      ]);
    });

    it<SpaceTestContext>('retrieves active space members by connection', async ({ presenceMap, space }) => {
      presenceMap.set('1', createPresenceMessage('update'));

      await space.enter();
      const member = await space.members.getByConnectionId('1');
      expect(member).toEqual(createSpaceMember());

      const noMember = await space.members.getByConnectionId('nonExistentConnectionId');
      expect(noMember).toBe(undefined);
    });

    it<SpaceTestContext>('initialises locks', async ({ presenceMap, space }) => {
      presenceMap.set(
        '1',
        createPresenceMessage('enter', {
          connectionId: '1',
          extras: {
            locks: [
              { id: 'lock1', status: 'pending', timestamp: 2 },
              { id: 'lock2', status: 'pending', timestamp: 2 },
            ],
          },
        }),
      );
      presenceMap.set(
        '2',
        createPresenceMessage('enter', {
          connectionId: '2',
          extras: {
            locks: [
              { id: 'lock1', status: 'pending', timestamp: 1 },
              { id: 'lock3', status: 'pending', timestamp: 3 },
            ],
          },
        }),
      );
      await space.enter();

      const member1 = await space.members.getByConnectionId('1')!;
      const member2 = await space.members.getByConnectionId('2')!;

      const lock1 = space.locks.get('lock1')!;
      expect(lock1.member).toEqual(member2);
      const lock2 = space.locks.get('lock2')!;
      expect(lock2.member).toEqual(member1);
      const lock3 = space.locks.get('lock3')!;
      expect(lock3.member).toEqual(member2);
    });
  });

  describe('updateProfileData', () => {
    describe('did not enter', () => {
      it<SpaceTestContext>('enter & update profileData successfully', async ({ presence, space }) => {
        const enterSpy = vi.spyOn(presence, 'enter');
        const updateSpy = vi.spyOn(presence, 'update');
        await space.updateProfileData({ name: 'Betty' });
        expect(enterSpy).toHaveBeenNthCalledWith(1, createProfileUpdate({ current: { name: 'Betty' } }));
        expect(updateSpy).not.toHaveBeenCalled();
      });

      it<SpaceTestContext>('enter & update profileData with function successfully', async ({ presence, space }) => {
        const enterSpy = vi.spyOn(presence, 'enter');
        const updateSpy = vi.spyOn(presence, 'update');
        await space.updateProfileData((profileData) => ({ ...profileData, name: 'Betty' }));
        expect(enterSpy).toHaveBeenNthCalledWith(1, createProfileUpdate({ current: { name: 'Betty' } }));
        expect(updateSpy).not.toHaveBeenCalled();
      });
    });

    describe('did enter', () => {
      it<SpaceTestContext>('update profileData successfully', async ({ presence, presenceMap, space }) => {
        presenceMap.set('1', createPresenceMessage('enter'));
        const updateSpy = vi.spyOn(presence, 'update');

        await space.updateProfileData({ name: 'Betty' });
        expect(updateSpy).toHaveBeenNthCalledWith(1, createProfileUpdate({ current: { name: 'Betty' } }));
      });

      it<SpaceTestContext>('enter & update profileData with function successfully', async ({
        presence,
        presenceMap,
        space,
      }) => {
        presenceMap.set('1', createPresenceMessage('enter'));
        const updateSpy = vi.spyOn(presence, 'update');
        await space.updateProfileData((profileData) => ({ ...profileData, name: 'Betty' }));
        expect(updateSpy).toHaveBeenNthCalledWith(1, createProfileUpdate({ current: { name: 'Betty' } }));
      });
    });
  });

  describe('leave', () => {
    it<SpaceTestContext>('leaves a space successfully', async ({ presence, presenceMap, space }) => {
      presenceMap.set('1', createPresenceMessage('enter'));

      await space.enter();
      const spy = vi.spyOn(presence, 'leave');
      await space.leave();
      expect(spy).toHaveBeenCalledOnce();
    });
  });

  describe('subscribe', () => {
    it('subscribes to presence updates', async () => {
      const client = new Realtime({});
      const presence = client.channels.get('').presence;
      const spy = vi.spyOn(presence, 'subscribe');
      new Space('test', client);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it<SpaceTestContext>('adds new members', async ({ space, presenceMap }) => {
      const callbackSpy = vi.fn();
      space.subscribe('update', callbackSpy);
      await createPresenceEvent(space, presenceMap, 'enter');

      const member1 = createSpaceMember({ lastEvent: { name: 'enter', timestamp: 1 } });
      expect(callbackSpy).toHaveBeenNthCalledWith(1, {
        members: [member1],
      });

      await createPresenceEvent(space, presenceMap, 'enter', {
        clientId: '2',
        connectionId: '2',
        data: createProfileUpdate({ current: { name: 'Betty' } }),
      });

      expect(callbackSpy).toHaveBeenNthCalledWith(2, {
        members: [
          member1,
          createSpaceMember({
            clientId: '2',
            connectionId: '2',
            lastEvent: { name: 'enter', timestamp: 1 },
            profileData: { name: 'Betty' },
          }),
        ],
      });
    });

    it<SpaceTestContext>('updates the data of members', async ({ space, presenceMap }) => {
      const callbackSpy = vi.fn();
      space.subscribe('update', callbackSpy);

      await createPresenceEvent(space, presenceMap, 'enter');
      expect(callbackSpy).toHaveBeenNthCalledWith(1, {
        members: [createSpaceMember({ lastEvent: { name: 'enter', timestamp: 1 } })],
      });

      await createPresenceEvent(space, presenceMap, 'update', {
        data: createProfileUpdate({ current: { name: 'Betty' } }),
      });

      expect(callbackSpy).toHaveBeenNthCalledWith(2, {
        members: [createSpaceMember({ profileData: { name: 'Betty' } })],
      });
    });

    it<SpaceTestContext>('updates the connected status of clients who have left', async ({ space, presenceMap }) => {
      const callbackSpy = vi.fn();
      space.subscribe('update', callbackSpy);

      await createPresenceEvent(space, presenceMap, 'enter');
      expect(callbackSpy).toHaveBeenNthCalledWith(1, {
        members: [createSpaceMember({ lastEvent: { name: 'enter', timestamp: 1 } })],
      });

      await createPresenceEvent(space, presenceMap, 'leave');
      expect(callbackSpy).toHaveBeenNthCalledWith(2, {
        members: [createSpaceMember({ isConnected: false, lastEvent: { name: 'leave', timestamp: 1 } })],
      });
    });

    describe('leavers', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it<SpaceTestContext>('removes a member who has left after the offlineTimeout', async ({ space, presenceMap }) => {
        const callbackSpy = vi.fn();
        space.subscribe('update', callbackSpy);

        await createPresenceEvent(space, presenceMap, 'enter');
        expect(callbackSpy).toHaveBeenNthCalledWith(1, {
          members: [createSpaceMember({ lastEvent: { name: 'enter', timestamp: 1 } })],
        });

        await createPresenceEvent(space, presenceMap, 'leave');
        expect(callbackSpy).toHaveBeenNthCalledWith(2, {
          members: [createSpaceMember({ isConnected: false, lastEvent: { name: 'leave', timestamp: 1 } })],
        });

        await vi.advanceTimersByTimeAsync(130_000);

        expect(callbackSpy).toHaveBeenNthCalledWith(3, { members: [] });
        expect(callbackSpy).toHaveBeenCalledTimes(3);
      });

      it<SpaceTestContext>('does not remove a member that has rejoined', async ({ space, presenceMap }) => {
        const callbackSpy = vi.fn();
        space.subscribe('update', callbackSpy);

        await createPresenceEvent(space, presenceMap, 'enter');
        await createPresenceEvent(space, presenceMap, 'enter', { clientId: '2', connectionId: '2' });
        expect(callbackSpy).toHaveBeenNthCalledWith(2, {
          members: [
            createSpaceMember({ lastEvent: { name: 'enter', timestamp: 1 } }),
            createSpaceMember({ clientId: '2', connectionId: '2', lastEvent: { name: 'enter', timestamp: 1 } }),
          ],
        });

        await createPresenceEvent(space, presenceMap, 'leave');
        expect(callbackSpy).toHaveBeenNthCalledWith(3, {
          members: [
            createSpaceMember({ clientId: '2', connectionId: '2', lastEvent: { name: 'enter', timestamp: 1 } }),
            createSpaceMember({ lastEvent: { name: 'leave', timestamp: 1 }, isConnected: false }),
          ],
        });

        await vi.advanceTimersByTimeAsync(60_000);
        await createPresenceEvent(space, presenceMap, 'enter');
        expect(callbackSpy).toHaveBeenNthCalledWith(4, {
          members: [
            createSpaceMember({ clientId: '2', connectionId: '2', lastEvent: { name: 'enter', timestamp: 1 } }),
            createSpaceMember({ lastEvent: { name: 'enter', timestamp: 1 } }),
          ],
        });

        await vi.advanceTimersByTimeAsync(130_000); // 2:10 passed, default timeout is 2 min
        expect(callbackSpy).toHaveBeenCalledTimes(4);
      });

      it<SpaceTestContext>('unsubscribes when unsubscribe is called', async ({ space, presenceMap }) => {
        const spy = vi.fn();
        space.subscribe('update', spy);
        await createPresenceEvent(space, presenceMap, 'enter', { clientId: '2' });
        space.unsubscribe('update', spy);
        await createPresenceEvent(space, presenceMap, 'enter', { clientId: '2' });

        expect(spy).toHaveBeenCalledOnce();
      });

      it<SpaceTestContext>('unsubscribes when unsubscribe is called with no arguments', async ({
        space,
        presenceMap,
      }) => {
        const spy = vi.fn();
        space.subscribe('update', spy);
        await createPresenceEvent(space, presenceMap, 'enter', { clientId: '2' });
        space.unsubscribe();
        await createPresenceEvent(space, presenceMap, 'enter', { clientId: '2' });

        expect(spy).toHaveBeenCalledOnce();
      });
    });
  });

  describe('locations', () => {
    it<SpaceTestContext>('returns a Locations object', ({ space }) => {
      expect(space.locations).toBeInstanceOf(Locations);
    });
  });

  describe('cursors', () => {
    it<SpaceTestContext>('returns a Cursors object', ({ space }) => {
      expect(space.cursors).toBeInstanceOf(Cursors);
    });
  });
});
