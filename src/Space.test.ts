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
}

vi.mock('ably/promises');
vi.mock('nanoid');

describe('Space', () => {
  beforeEach<SpaceTestContext>((context) => {
    const client = new Realtime({});
    const space = new Space('test', client);

    context.client = client;
    context.space = space;
    context.presence = space.channel.presence;
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

    it<SpaceTestContext>('returns current space members', async ({ presence, space }) => {
      vi.spyOn(presence, 'get').mockImplementationOnce(async () => [
        createPresenceMessage('enter'),
        createPresenceMessage('update', { clientId: '2', connectionId: '2' }),
      ]);

      const spaceMembers = await space.enter();

      expect(spaceMembers).toEqual([
        createSpaceMember({ lastEvent: { name: 'enter', timestamp: 1 } }),
        createSpaceMember({ clientId: '2', connectionId: '2', lastEvent: { name: 'update', timestamp: 1 } }),
      ]);
    });

    it<SpaceTestContext>('retrieves active space members by connection', async ({ presence, space }) => {
      vi.spyOn(presence, 'get').mockImplementationOnce(async () => [createPresenceMessage('update')]);

      await space.enter();
      const member = space.members.getByConnectionId('1');
      expect(member).toEqual(createSpaceMember());

      const noMember = space.members.getByConnectionId('nonExistentConnectionId');
      expect(noMember).toBe(undefined);
    });

    it<SpaceTestContext>('initialises locks', async ({ presence, space }) => {
      vi.spyOn(presence, 'get').mockImplementationOnce(async () => [
        createPresenceMessage('enter', {
          connectionId: '1',
          extras: {
            locks: [
              { id: 'lock1', status: 'pending', timestamp: 2 },
              { id: 'lock2', status: 'pending', timestamp: 2 },
            ],
          },
        }),
        createPresenceMessage('enter', {
          connectionId: '2',
          extras: {
            locks: [
              { id: 'lock1', status: 'pending', timestamp: 1 },
              { id: 'lock3', status: 'pending', timestamp: 3 },
            ],
          },
        }),
      ]);
      await space.enter();

      const member1 = space.members.getByConnectionId('1')!;
      const member2 = space.members.getByConnectionId('2')!;

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
      it<SpaceTestContext>('update profileData successfully', async ({ presence, space }) => {
        vi.spyOn(space.members, 'getSelf').mockResolvedValueOnce(createSpaceMember());
        const updateSpy = vi.spyOn(presence, 'update');

        await space.updateProfileData({ name: 'Betty' });
        expect(updateSpy).toHaveBeenNthCalledWith(1, createProfileUpdate({ current: { name: 'Betty' } }));
      });

      it<SpaceTestContext>('enter & update profileData with function successfully', async ({ presence, space }) => {
        vi.spyOn(space.members, 'getSelf').mockResolvedValueOnce(createSpaceMember());
        const updateSpy = vi.spyOn(presence, 'update');
        await space.updateProfileData((profileData) => ({ ...profileData, name: 'Betty' }));
        expect(updateSpy).toHaveBeenNthCalledWith(1, createProfileUpdate({ current: { name: 'Betty' } }));
      });
    });
  });

  describe('leave', () => {
    it<SpaceTestContext>('leaves a space successfully', async ({ presence, space }) => {
      vi.spyOn(presence, 'get').mockImplementationOnce(async () => [createPresenceMessage('enter')]);

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

    it<SpaceTestContext>('does not include the connected client in the members result', async ({ space, client }) => {
      const spy = vi.fn();
      space['onPresenceUpdate'](createPresenceMessage('enter', { clientId: client.auth.clientId }));
      space.subscribe('update', spy);
      expect(spy).not.toHaveBeenCalled();
    });

    it<SpaceTestContext>('adds new members', async ({ space }) => {
      const callbackSpy = vi.fn();
      space.subscribe('update', callbackSpy);
      createPresenceEvent(space, 'enter');

      const member1 = createSpaceMember({ lastEvent: { name: 'enter', timestamp: 1 } });
      expect(callbackSpy).toHaveBeenNthCalledWith(1, {
        members: [member1],
      });

      createPresenceEvent(space, 'enter', {
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

    it<SpaceTestContext>('updates the data of members', async ({ space }) => {
      const callbackSpy = vi.fn();
      space.subscribe('update', callbackSpy);

      createPresenceEvent(space, 'enter');
      expect(callbackSpy).toHaveBeenNthCalledWith(1, {
        members: [createSpaceMember({ lastEvent: { name: 'enter', timestamp: 1 } })],
      });

      createPresenceEvent(space, 'update', {
        data: createProfileUpdate({ current: { name: 'Betty' } }),
      });

      expect(callbackSpy).toHaveBeenNthCalledWith(2, {
        members: [createSpaceMember({ profileData: { name: 'Betty' } })],
      });
    });

    it<SpaceTestContext>('updates the connected status of clients who have left', async ({ space }) => {
      const callbackSpy = vi.fn();
      space.subscribe('update', callbackSpy);

      createPresenceEvent(space, 'enter');
      expect(callbackSpy).toHaveBeenNthCalledWith(1, {
        members: [createSpaceMember({ lastEvent: { name: 'enter', timestamp: 1 } })],
      });

      createPresenceEvent(space, 'leave');
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

      it<SpaceTestContext>('removes a member who has left after the offlineTimeout', async ({ space }) => {
        const callbackSpy = vi.fn();
        space.subscribe('update', callbackSpy);

        createPresenceEvent(space, 'enter');
        expect(callbackSpy).toHaveBeenNthCalledWith(1, {
          members: [createSpaceMember({ lastEvent: { name: 'enter', timestamp: 1 } })],
        });

        createPresenceEvent(space, 'leave');
        expect(callbackSpy).toHaveBeenNthCalledWith(2, {
          members: [createSpaceMember({ isConnected: false, lastEvent: { name: 'leave', timestamp: 1 } })],
        });

        vi.advanceTimersByTime(130_000);

        expect(callbackSpy).toHaveBeenNthCalledWith(3, { members: [] });
        expect(callbackSpy).toHaveBeenCalledTimes(3);
      });

      it<SpaceTestContext>('does not remove a member that has rejoined', async ({ space }) => {
        const callbackSpy = vi.fn();
        space.subscribe('update', callbackSpy);

        createPresenceEvent(space, 'enter');
        createPresenceEvent(space, 'enter', { clientId: '2', connectionId: '2' });
        expect(callbackSpy).toHaveBeenNthCalledWith(2, {
          members: [
            createSpaceMember({ lastEvent: { name: 'enter', timestamp: 1 } }),
            createSpaceMember({ clientId: '2', connectionId: '2', lastEvent: { name: 'enter', timestamp: 1 } }),
          ],
        });

        createPresenceEvent(space, 'leave');
        expect(callbackSpy).toHaveBeenNthCalledWith(3, {
          members: [
            createSpaceMember({ clientId: '2', connectionId: '2', lastEvent: { name: 'enter', timestamp: 1 } }),
            createSpaceMember({ lastEvent: { name: 'leave', timestamp: 1 }, isConnected: false }),
          ],
        });

        vi.advanceTimersByTime(60_000);
        createPresenceEvent(space, 'enter');
        expect(callbackSpy).toHaveBeenNthCalledWith(4, {
          members: [
            createSpaceMember({ clientId: '2', connectionId: '2', lastEvent: { name: 'enter', timestamp: 1 } }),
            createSpaceMember({ lastEvent: { name: 'enter', timestamp: 1 } }),
          ],
        });

        vi.advanceTimersByTime(130_000); // 2:10 passed, default timeout is 2 min
        expect(callbackSpy).toHaveBeenCalledTimes(4);
      });

      it<SpaceTestContext>('unsubscribes when unsubscribe is called', async ({ space }) => {
        const spy = vi.fn();
        space.subscribe('update', spy);
        createPresenceEvent(space, 'enter', { clientId: '2' });
        space.unsubscribe('update', spy);
        createPresenceEvent(space, 'enter', { clientId: '2' });

        expect(spy).toHaveBeenCalledOnce();
      });

      it<SpaceTestContext>('unsubscribes when unsubscribe is called with no arguments', async ({ space }) => {
        const spy = vi.fn();
        space.subscribe('update', spy);
        createPresenceEvent(space, 'enter', { clientId: '2' });
        space.unsubscribe();
        createPresenceEvent(space, 'enter', { clientId: '2' });

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
