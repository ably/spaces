import { it, describe, expect, vi, beforeEach, expectTypeOf, afterEach } from 'vitest';
import { Realtime, Types } from 'ably/promises';

import Space, { SpaceMember } from './Space.js';
import { createPresenceEvent, createPresenceMessage } from './utilities/test/fakes.js';
import Locations from './Locations.js';
import Cursors from './Cursors.js';
import { MEMBERS_UPDATE } from './utilities/Constants.js';

interface SpaceTestContext {
  client: Types.RealtimePromise;
  space: Space;
  presence: Types.RealtimePresencePromise;
}

vi.mock('ably/promises');

describe('Space (mockClient)', () => {
  beforeEach<SpaceTestContext>((context) => {
    const client = new Realtime({});
    const presence = client.channels.get('').presence;

    context.client = client;
    context.space = new Space('test', client);
    context.presence = presence;
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
    it<SpaceTestContext>('enter a space successfully', async ({ presence, space }) => {
      const spy = vi.spyOn(presence, 'enter').mockResolvedValueOnce();
      await space.enter({ a: 1 });
      expect(spy).toHaveBeenNthCalledWith(1, { profileData: { a: 1 } });
    });

    it<SpaceTestContext>('returns current space members', async ({ presence, space }) => {
      vi.spyOn(presence, 'get').mockImplementationOnce(async () => [
        createPresenceMessage('enter'),
        createPresenceMessage('update', { clientId: '2', connectionId: '2' }),
      ]);
      const spaceMembers = await space.enter();
      expect(spaceMembers).toEqual<SpaceMember[]>([
        {
          clientId: '1',
          connectionId: '1',
          isConnected: true,
          profileData: {},
          location: null,
          lastEvent: { name: 'enter', timestamp: 1 },
        },
        {
          clientId: '2',
          connectionId: '2',
          isConnected: true,
          profileData: { a: 1 },
          location: null,
          lastEvent: { name: 'update', timestamp: 1 },
        },
      ]);
    });

    it<SpaceTestContext>('retrieves active space members by connection', async ({ presence, space }) => {
      vi.spyOn(presence, 'get').mockImplementationOnce(async () => [
        createPresenceMessage('enter', { connectionId: 'testConnectionId' }),
      ]);
      await space.enter();
      const member = space.getMemberFromConnection('testConnectionId');
      expect(member).toEqual<SpaceMember>({
        clientId: '1',
        connectionId: 'testConnectionId',
        isConnected: true,
        location: null,
        lastEvent: {
          name: 'enter',
          timestamp: 1,
        },
        profileData: {},
      });
      const noMember = space.getMemberFromConnection('nonExistentConnectionId');
      expect(noMember).toBe(undefined);
    });
  });

  describe('updateProfileData', () => {
    describe('did not enter', () => {
      it<SpaceTestContext>('enter & update profileData successfully', async ({ presence, space }) => {
        const enterSpy = vi.spyOn(presence, 'enter');
        const updateSpy = vi.spyOn(presence, 'update');
        await space.updateProfileData({ a: 1 });
        expect(enterSpy).toHaveBeenNthCalledWith(1, { profileData: { a: 1 } });
        expect(updateSpy).not.toHaveBeenCalled();
      });

      it<SpaceTestContext>('enter & update profileData with function successfully', async ({ presence, space }) => {
        const enterSpy = vi.spyOn(presence, 'enter');
        const updateSpy = vi.spyOn(presence, 'update');
        await space.updateProfileData((profileData) => ({ ...profileData, a: 1 }));
        expect(enterSpy).toHaveBeenNthCalledWith(1, { profileData: { a: 1 } });
        expect(updateSpy).not.toHaveBeenCalled();
      });
    });

    describe('did enter', () => {
      it<SpaceTestContext>('update profileData successfully', async ({ presence, space }) => {
        vi.spyOn(space, 'getSelf').mockResolvedValueOnce({
          clientId: '1',
          connectionId: 'testConnectionId',
          isConnected: true,
          location: null,
          lastEvent: {
            name: 'enter',
            timestamp: 1,
          },
          profileData: {
            a: 1,
          },
        });
        const updateSpy = vi.spyOn(presence, 'update');
        await space.updateProfileData({ a: 2 });
        expect(updateSpy).toHaveBeenNthCalledWith(1, { profileData: { a: 2 } });
      });

      it<SpaceTestContext>('enter & update profileData with function successfully', async ({ presence, space }) => {
        vi.spyOn(space, 'getSelf').mockResolvedValueOnce({
          clientId: '1',
          connectionId: 'testConnectionId',
          isConnected: true,
          location: null,
          lastEvent: {
            name: 'enter',
            timestamp: 1,
          },
          profileData: {
            a: 1,
          },
        });
        const updateSpy = vi.spyOn(presence, 'update');
        await space.updateProfileData((profileData) => ({ ...profileData, a: 2 }));
        expect(updateSpy).toHaveBeenNthCalledWith(1, { profileData: { a: 2 } });
      });
    });
  });

  describe('leave', () => {
    it<SpaceTestContext>('leaves a space successfully', async ({ presence, space }) => {
      const spy = vi.spyOn(presence, 'leave');
      await space.leave();
      expect(spy).toHaveBeenCalledOnce();
    });
  });

  describe('on', () => {
    it('subscribes to presence updates', async () => {
      const client = new Realtime({});
      const presence = client.channels.get('').presence;
      const spy = vi.spyOn(presence, 'subscribe');
      new Space('test', client);
      // Called by Space instantiation and by Locations instantiation
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it<SpaceTestContext>('does not include the connected client in the members result', async ({ space, client }) => {
      const spy = vi.fn();
      space['onPresenceUpdate'](createPresenceMessage('enter', { clientId: client.auth.clientId }));
      space.on(MEMBERS_UPDATE, spy);
      expect(spy).not.toHaveBeenCalled();
    });

    it<SpaceTestContext>('adds new members', async ({ space }) => {
      const callbackSpy = vi.fn();
      space.on(MEMBERS_UPDATE, callbackSpy);

      createPresenceEvent(space, 'enter');

      expect(callbackSpy).toHaveBeenNthCalledWith<SpaceMember[][]>(1, [
        {
          clientId: '1',
          connectionId: '1',
          profileData: {},
          isConnected: true,
          location: null,
          lastEvent: { name: 'enter', timestamp: 1 },
        },
      ]);

      createPresenceEvent(space, 'enter', { clientId: '2', connectionId: '2', data: { profileData: { a: 1 } } });
      expect(callbackSpy).toHaveBeenNthCalledWith<SpaceMember[][]>(1, [
        {
          clientId: '1',
          connectionId: '1',
          profileData: {},
          isConnected: true,
          location: null,
          lastEvent: { name: 'enter', timestamp: 1 },
        },
        {
          clientId: '2',
          connectionId: '2',
          profileData: { a: 1 },
          isConnected: true,
          location: null,
          lastEvent: { name: 'enter', timestamp: 1 },
        },
      ]);
    });

    it<SpaceTestContext>('updates the data of members', async ({ space }) => {
      const callbackSpy = vi.fn();
      space.on(MEMBERS_UPDATE, callbackSpy);

      createPresenceEvent(space, 'enter');
      expect(callbackSpy).toHaveBeenNthCalledWith<SpaceMember[][]>(1, [
        {
          clientId: '1',
          connectionId: '1',
          profileData: {},
          isConnected: true,
          location: null,
          lastEvent: { name: 'enter', timestamp: 1 },
        },
      ]);

      createPresenceEvent(space, 'enter', { data: { profileData: { a: 1 } } });
      expect(callbackSpy).toHaveBeenNthCalledWith<SpaceMember[][]>(1, [
        {
          clientId: '1',
          connectionId: '1',
          profileData: { a: 1 },
          isConnected: true,
          location: null,
          lastEvent: { name: 'enter', timestamp: 1 },
        },
      ]);
    });

    it<SpaceTestContext>('updates the connected status of clients who have left', async ({ space }) => {
      const callbackSpy = vi.fn();
      space.on(MEMBERS_UPDATE, callbackSpy);

      createPresenceEvent(space, 'enter');
      expect(callbackSpy).toHaveBeenNthCalledWith<SpaceMember[][]>(1, [
        {
          clientId: '1',
          connectionId: '1',
          profileData: {},
          isConnected: true,
          location: null,
          lastEvent: { name: 'enter', timestamp: 1 },
        },
      ]);

      createPresenceEvent(space, 'leave');
      expect(callbackSpy).toHaveBeenNthCalledWith<SpaceMember[][]>(1, [
        {
          clientId: '1',
          connectionId: '1',
          profileData: {},
          isConnected: false,
          location: null,
          lastEvent: { name: 'leave', timestamp: 1 },
        },
      ]);
    });

    it<SpaceTestContext>('fires an enter message on join', async ({ space }) => {
      const callbackSpy = vi.fn();
      space.on('enter', callbackSpy);

      createPresenceEvent(space, 'enter');

      expect(callbackSpy).toHaveBeenNthCalledWith<SpaceMember[]>(1, {
        clientId: '1',
        connectionId: '1',
        profileData: {},
        isConnected: true,
        location: null,
        lastEvent: { name: 'enter', timestamp: 1 },
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
        space.on(MEMBERS_UPDATE, callbackSpy);

        createPresenceEvent(space, 'enter');
        expect(callbackSpy).toHaveBeenNthCalledWith<SpaceMember[][]>(1, [
          {
            clientId: '1',
            connectionId: '1',
            profileData: {},
            isConnected: true,
            location: null,
            lastEvent: { name: 'enter', timestamp: 1 },
          },
        ]);

        createPresenceEvent(space, 'leave');
        expect(callbackSpy).toHaveBeenNthCalledWith<SpaceMember[][]>(1, [
          {
            clientId: '1',
            connectionId: '1',
            profileData: {},
            isConnected: false,
            location: null,
            lastEvent: { name: 'leave', timestamp: 1 },
          },
        ]);

        vi.advanceTimersByTime(130_000);

        expect(callbackSpy).toHaveBeenNthCalledWith(1, []);
        expect(callbackSpy).toHaveBeenCalledTimes(3);
      });

      it<SpaceTestContext>('sends a leave event after offlineTimeout', async ({ space }) => {
        const callbackSpy = vi.fn();
        space.on('leave', callbackSpy);

        createPresenceEvent(space, 'enter');
        createPresenceEvent(space, 'leave');

        vi.advanceTimersByTime(130_000);

        expect(callbackSpy).toHaveBeenNthCalledWith<SpaceMember[]>(1, {
          clientId: '1',
          connectionId: '1',
          profileData: {},
          isConnected: false,
          location: null,
          lastEvent: { name: 'leave', timestamp: 1 },
        });
      });

      it<SpaceTestContext>('does not remove a member that has rejoined', async ({ space }) => {
        const callbackSpy = vi.fn();
        space.on(MEMBERS_UPDATE, callbackSpy);

        createPresenceEvent(space, 'enter');
        createPresenceEvent(space, 'enter', { clientId: '2', connectionId: '2' });
        expect(callbackSpy).toHaveBeenNthCalledWith<SpaceMember[][]>(1, [
          {
            clientId: '1',
            connectionId: '1',
            profileData: {},
            isConnected: true,
            location: null,
            lastEvent: { name: 'enter', timestamp: 1 },
          },
          {
            clientId: '2',
            connectionId: '2',
            profileData: {},
            isConnected: true,
            location: null,
            lastEvent: { name: 'enter', timestamp: 1 },
          },
        ]);

        createPresenceEvent(space, 'leave');
        expect(callbackSpy).toHaveBeenNthCalledWith<SpaceMember[][]>(1, [
          {
            clientId: '1',
            connectionId: '1',
            profileData: {},
            isConnected: false,
            location: null,
            lastEvent: { name: 'leave', timestamp: 1 },
          },
          {
            clientId: '2',
            connectionId: '2',
            profileData: {},
            isConnected: true,
            location: null,
            lastEvent: { name: 'enter', timestamp: 1 },
          },
        ]);

        vi.advanceTimersByTime(60_000);
        createPresenceEvent(space, 'enter');
        expect(callbackSpy).toHaveBeenNthCalledWith<SpaceMember[][]>(1, [
          {
            clientId: '1',
            connectionId: '1',
            profileData: {},
            isConnected: true,
            location: null,
            lastEvent: { name: 'enter', timestamp: 1 },
          },
          {
            clientId: '2',
            connectionId: '2',
            profileData: {},
            isConnected: true,
            location: null,
            lastEvent: { name: 'enter', timestamp: 1 },
          },
        ]);

        vi.advanceTimersByTime(70_000); // 2:10 passed, default timeout is 2 min
        expect(callbackSpy).toHaveBeenNthCalledWith<SpaceMember[][]>(1, [
          {
            clientId: '1',
            connectionId: '1',
            profileData: {},
            isConnected: true,
            location: null,
            lastEvent: { name: 'enter', timestamp: 1 },
          },
          {
            clientId: '2',
            connectionId: '2',
            profileData: {},
            isConnected: true,
            location: null,
            lastEvent: { name: 'enter', timestamp: 1 },
          },
        ]);

        expect(callbackSpy).toHaveBeenCalledTimes(4);
      });

      it<SpaceTestContext>('unsubscribes when off is called', async ({ space }) => {
        const spy = vi.fn();
        space.on(MEMBERS_UPDATE, spy);
        createPresenceEvent(space, 'enter', { clientId: '123456' });
        space.off(MEMBERS_UPDATE, spy);
        createPresenceEvent(space, 'enter', { clientId: '123456' });

        expect(spy).toHaveBeenCalledOnce();
      });

      it<SpaceTestContext>('unsubscribes when off is called with no arguments', async ({ space }) => {
        const spy = vi.fn();
        space.on(MEMBERS_UPDATE, spy);
        createPresenceEvent(space, 'enter', { clientId: '123456' });
        space.off();
        createPresenceEvent(space, 'enter', { clientId: '123456' });

        expect(spy).toHaveBeenCalledOnce();
      });

      it<SpaceTestContext>('emits a location event when a user leaves and when offlineTimeout passes', async ({
        space,
      }) => {
        const spy = vi.spyOn(space.locations, 'emit');

        // These share the same connection/client ids
        createPresenceEvent(space, 'enter');

        // Simulate a "set" location for a user
        space.locations['onPresenceUpdate'](
          createPresenceMessage('update', { data: { previousLocation: null, currentLocation: { location: '1' } } }),
        );

        expect(spy).toHaveBeenCalledTimes(1);

        // We need to mock the message for both space & locations
        const msg = createPresenceMessage('leave', {
          data: { previousLocation: { location: '1' }, currentLocation: { location: '2' } },
        });
        space['onPresenceUpdate'](msg);
        space.locations['onPresenceUpdate'](msg);

        expect(spy).toHaveBeenCalledTimes(2);

        vi.advanceTimersByTime(130_000);

        expect(spy).toHaveBeenCalledTimes(3);
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
