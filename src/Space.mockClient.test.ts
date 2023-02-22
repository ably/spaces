import { it, describe, expect, vi, beforeEach, expectTypeOf, afterEach } from 'vitest';
import Ably, { Types } from 'ably/promises';

import Space, { SpaceMember } from './Space';
import { createPresenceEvent, createPresenceMessage } from './utilities/test/fakes';

interface SpaceTestContext {
  client: Types.RealtimePromise;
  space: Space;
  presence: Types.RealtimePresencePromise;
}

vi.mock('ably/promises');

describe('Space (mockClient)', () => {
  beforeEach<SpaceTestContext>((context) => {
    const client = new Ably.Realtime({});
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
      // Note: This is matching the class type. This is not a TypeScript type.
      expectTypeOf(space).toMatchTypeOf<Space>();
    });
  });

  describe('enter', () => {
    it<SpaceTestContext>('enter a space successfully', async ({ presence, space }) => {
      const spy = vi.spyOn(presence, 'enter').mockResolvedValueOnce();
      await space.enter({ a: 1 });
      expect(spy).toHaveBeenNthCalledWith(1, { a: 1 });
    });

    it<SpaceTestContext>('returns current space members', async ({ presence, space }) => {
      vi.spyOn(presence, 'get').mockImplementationOnce(async () => [
        createPresenceMessage('enter'),
        createPresenceMessage('update', { clientId: '2' }),
      ]);
      const spaceMembers = await space.enter();
      expect(spaceMembers).toEqual<SpaceMember[]>([
        { clientId: '1', isConnected: true, profileData: {}, lastEvent: { name: 'enter', timestamp: 1 } },
        { clientId: '2', isConnected: true, profileData: { a: 1 }, lastEvent: { name: 'update', timestamp: 1 } },
      ]);
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
    it<SpaceTestContext>('subscribes to presence updates', async ({ presence, space }) => {
      const spy = vi.spyOn(presence, 'subscribe');
      space.on('membersUpdate', () => {});
      expect(spy).toHaveBeenCalledOnce();
    });

    it<SpaceTestContext>('errors if an unrecognized event is passed in', async ({ space }) => {
      await space.enter();
      // @ts-expect-error
      expect(() => space.on('invalidEvent', () => {})).toThrowError('Event "invalidEvent" is unsupported');
    });

    it<SpaceTestContext>('subscribes to presence events', async ({ presence, space }) => {
      const spy = vi.spyOn(presence, 'subscribe');
      space.on('membersUpdate', vi.fn());
      expect(spy).toHaveBeenCalled();
    });

    it<SpaceTestContext>('does not include the connected client in the members result', async ({ space, client }) => {
      const spy = vi.fn();
      space.dispatchEvent(createPresenceEvent('enter', { clientId: client.auth.clientId }));
      space.on('membersUpdate', spy);
      expect(spy).not.toHaveBeenCalled();
    });

    it<SpaceTestContext>('adds new members', async ({ space }) => {
      const callbackSpy = vi.fn();
      space.on('membersUpdate', callbackSpy);

      space.dispatchEvent(createPresenceEvent('enter'));
      expect(callbackSpy).toHaveBeenNthCalledWith<SpaceMember[][]>(1, [
        {
          clientId: '1',
          profileData: {},
          isConnected: true,
          lastEvent: { name: 'enter', timestamp: 1 },
        },
      ]);

      space.dispatchEvent(createPresenceEvent('enter', { clientId: '2', data: { a: 1 } }));
      expect(callbackSpy).toHaveBeenNthCalledWith<SpaceMember[][]>(1, [
        {
          clientId: '1',
          profileData: {},
          isConnected: true,
          lastEvent: { name: 'enter', timestamp: 1 },
        },
        {
          clientId: '2',
          profileData: { a: 1 },
          isConnected: true,
          lastEvent: { name: 'enter', timestamp: 1 },
        },
      ]);
    });

    it<SpaceTestContext>('updates the data of members', async ({ space }) => {
      const callbackSpy = vi.fn();
      space.on('membersUpdate', callbackSpy);

      space.dispatchEvent(createPresenceEvent('enter'));
      expect(callbackSpy).toHaveBeenNthCalledWith<SpaceMember[][]>(1, [
        {
          clientId: '1',
          profileData: {},
          isConnected: true,
          lastEvent: { name: 'enter', timestamp: 1 },
        },
      ]);

      space.dispatchEvent(createPresenceEvent('update', { data: { a: 1 } }));
      expect(callbackSpy).toHaveBeenNthCalledWith<SpaceMember[][]>(1, [
        {
          clientId: '1',
          profileData: { a: 1 },
          isConnected: true,
          lastEvent: { name: 'update', timestamp: 1 },
        },
      ]);
    });

    it<SpaceTestContext>('updates the connected status of clients who have left', async ({ space }) => {
      const callbackSpy = vi.fn();
      space.on('membersUpdate', callbackSpy);

      space.dispatchEvent(createPresenceEvent('enter'));
      expect(callbackSpy).toHaveBeenNthCalledWith<SpaceMember[][]>(1, [
        {
          clientId: '1',
          profileData: {},
          isConnected: true,
          lastEvent: { name: 'enter', timestamp: 1 },
        },
      ]);

      space.dispatchEvent(createPresenceEvent('leave'));
      expect(callbackSpy).toHaveBeenNthCalledWith<SpaceMember[][]>(1, [
        {
          clientId: '1',
          profileData: {},
          isConnected: false,
          lastEvent: { name: 'leave', timestamp: 1 },
        },
      ]);
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
        space.on('membersUpdate', callbackSpy);

        space.dispatchEvent(createPresenceEvent('enter'));
        expect(callbackSpy).toHaveBeenNthCalledWith<SpaceMember[][]>(1, [
          {
            clientId: '1',
            profileData: {},
            isConnected: true,
            lastEvent: { name: 'enter', timestamp: 1 },
          },
        ]);

        space.dispatchEvent(createPresenceEvent('leave'));
        expect(callbackSpy).toHaveBeenNthCalledWith<SpaceMember[][]>(1, [
          {
            clientId: '1',
            profileData: {},
            isConnected: false,
            lastEvent: { name: 'leave', timestamp: 1 },
          },
        ]);

        vi.advanceTimersByTime(130_000);

        expect(callbackSpy).toHaveBeenNthCalledWith(1, []);
        expect(callbackSpy).toHaveBeenCalledTimes(3);
      });

      it<SpaceTestContext>('does not remove a member that has rejoined', async ({ space }) => {
        const callbackSpy = vi.fn();
        space.on('membersUpdate', callbackSpy);

        space.dispatchEvent(createPresenceEvent('enter'));
        space.dispatchEvent(createPresenceEvent('enter', { clientId: '2' }));
        expect(callbackSpy).toHaveBeenNthCalledWith<SpaceMember[][]>(1, [
          {
            clientId: '1',
            profileData: {},
            isConnected: true,
            lastEvent: { name: 'enter', timestamp: 1 },
          },
          {
            clientId: '2',
            profileData: {},
            isConnected: true,
            lastEvent: { name: 'enter', timestamp: 1 },
          },
        ]);

        space.dispatchEvent(createPresenceEvent('leave'));
        expect(callbackSpy).toHaveBeenNthCalledWith<SpaceMember[][]>(1, [
          {
            clientId: '1',
            profileData: {},
            isConnected: false,
            lastEvent: { name: 'leave', timestamp: 1 },
          },
          {
            clientId: '2',
            profileData: {},
            isConnected: true,
            lastEvent: { name: 'enter', timestamp: 1 },
          },
        ]);

        vi.advanceTimersByTime(60_000);
        space.dispatchEvent(createPresenceEvent('enter'));
        expect(callbackSpy).toHaveBeenNthCalledWith<SpaceMember[][]>(1, [
          {
            clientId: '1',
            profileData: {},
            isConnected: true,
            lastEvent: { name: 'enter', timestamp: 1 },
          },
          {
            clientId: '2',
            profileData: {},
            isConnected: true,
            lastEvent: { name: 'enter', timestamp: 1 },
          },
        ]);

        vi.advanceTimersByTime(70_000); // 2:10 passed, default timeout is 2 min
        expect(callbackSpy).toHaveBeenNthCalledWith<SpaceMember[][]>(1, [
          {
            clientId: '1',
            profileData: {},
            isConnected: true,
            lastEvent: { name: 'enter', timestamp: 1 },
          },
          {
            clientId: '2',
            profileData: {},
            isConnected: true,
            lastEvent: { name: 'enter', timestamp: 1 },
          },
        ]);

        expect(callbackSpy).toHaveBeenCalledTimes(4);
      });
    });
  });
});
