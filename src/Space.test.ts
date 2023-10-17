import { it, describe, expect, vi, beforeEach, expectTypeOf } from 'vitest';
import { Realtime, Types } from 'ably/promises';

import Space from './Space.js';
import Locations from './Locations.js';
import Cursors from './Cursors.js';

import {
  createPresenceEvent,
  createPresenceMessage,
  createSpaceMember,
  createProfileUpdate,
  createLocationUpdate,
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

      expect(channelSpy).toHaveBeenNthCalledWith(
        1,
        'test-space',
        expect.objectContaining({
          params: expect.objectContaining({
            agent: expect.stringContaining('spaces'),
          }),
        }),
      );
      expectTypeOf(space).toMatchTypeOf<Space>();
    });
  });

  describe('enter', () => {
    beforeEach<SpaceTestContext>(({ presence }) => {
      vi.spyOn(presence, 'subscribe').mockImplementation(
        async (_, listener?: (presenceMessage: Types.PresenceMessage) => void) => {
          listener!(
            createPresenceMessage('enter' /* arbitrarily chosen */, { clientId: 'MOCK_CLIENT_ID', connectionId: '1' }),
          );
        },
      );
    });

    it<SpaceTestContext>('enter a space successfully', async ({ space, presence }) => {
      const presenceEnterSpy = vi.spyOn(presence, 'enter');
      const presenceSubscribeSpy = vi.spyOn(presence, 'subscribe');
      await space.enter({ name: 'Betty' });
      expect(presenceEnterSpy).toHaveBeenNthCalledWith(1, createProfileUpdate({ current: { name: 'Betty' } }));
      expect(presenceSubscribeSpy).toHaveBeenCalledWith(['enter', 'present'], expect.any(Function));
    });

    describe.each([
      {
        scenario: 'when it receives a presence message from a client ID and connection ID that matches ours',
        presenceMessageData: { clientId: 'MOCK_CLIENT_ID', connectionId: '1' },
        shouldComplete: true,
      },
      {
        scenario: 'when it receives a presence message from a client ID that isn’t ours',
        presenceMessageData: { clientId: 'OTHER_MOCK_CLIENT_ID', connectionId: '1' },
        shouldComplete: false,
      },
      {
        scenario: 'when it receives a presence message from a connection ID that isn’t ours',
        presenceMessageData: { clientId: 'MOCK_CLIENT_ID', connectionId: '2' },
        shouldComplete: false,
      },
    ])('$scenario', ({ presenceMessageData, shouldComplete }) => {
      it<SpaceTestContext>(shouldComplete ? 'completes' : 'does not complete', async ({ space, presence }) => {
        const unsubscribeSpy = vi.spyOn(presence, 'unsubscribe');

        vi.spyOn(presence, 'subscribe').mockImplementation(
          async (_, listener?: (presenceMessage: Types.PresenceMessage) => void) => {
            listener!(createPresenceMessage('enter' /* arbitrarily chosen */, presenceMessageData));
          },
        );

        space.enter();

        // Note: There’s no nice way (i.e. without timeouts) to actually check that space.enter() didn’t complete, so we use "did it remove its presence listener?" as a proxy for "did it complete?"
        if (shouldComplete) {
          expect(unsubscribeSpy).toHaveBeenCalled();
        } else {
          expect(unsubscribeSpy).not.toHaveBeenCalled();
        }
      });
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
      expect(noMember).toBeNull();
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
        presenceMap.set(
          '1',
          createPresenceMessage('enter', {
            data: {
              profileUpdate: {
                id: 1,
                current: { color: 'black' },
              },
              locationUpdate: {
                id: null,
                current: null,
                previous: null,
              },
            },
          }),
        );
        const updateSpy = vi.spyOn(presence, 'update');
        await space.updateProfileData((profileData) => ({ ...profileData, name: 'Betty' }));
        expect(updateSpy).toHaveBeenNthCalledWith(
          1,
          createProfileUpdate({ current: { name: 'Betty', color: 'black' } }),
        );
      });
    });

    it<SpaceTestContext>('maintains lock state in presence', async ({ space, presence, presenceMap }) => {
      presenceMap.set('1', createPresenceMessage('enter'));

      const lockID = 'test';
      const lockReq = await space.locks.acquire(lockID);

      const updateSpy = vi.spyOn(presence, 'update');
      await space.updateProfileData({ name: 'Betty' });
      const extras = { locks: [lockReq] };
      expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ extras }));
    });
  });

  describe('leave', () => {
    it<SpaceTestContext>('leaves a space successfully and does not nullify presence data', async ({
      presence,
      presenceMap,
      space,
    }) => {
      presenceMap.set(
        '1',
        createPresenceMessage('enter', {
          data: {
            profileUpdate: { id: 1, current: { name: 'Betty' } },
            locationUpdate: { id: null, current: { slide: 1 }, previous: null },
          },
        }),
      );

      const spy = vi.spyOn(presence, 'leave');
      await space.leave();
      expect(spy).toHaveBeenNthCalledWith(1, {
        profileUpdate: {
          id: null,
          current: { name: 'Betty' },
        },
        locationUpdate: {
          id: null,
          current: { slide: 1 },
          previous: null,
        },
      });
    });

    it<SpaceTestContext>('leaves a space successfully and nullifies presence data', async ({
      presence,
      presenceMap,
      space,
    }) => {
      presenceMap.set(
        '1',
        createPresenceMessage('enter', {
          data: {
            profileUpdate: { id: 1, current: { name: 'Betty' } },
            locationUpdate: { id: null, current: { slide: 1 }, previous: null },
          },
        }),
      );

      const spy = vi.spyOn(presence, 'leave');
      await space.leave(null);
      expect(spy).toHaveBeenNthCalledWith(1, {
        profileUpdate: {
          id: 'NanoidID',
          current: null,
        },
        locationUpdate: {
          id: null,
          current: { slide: 1 },
          previous: null,
        },
      });
    });

    it<SpaceTestContext>('leaves a space successfully and updates presence data', async ({
      presence,
      presenceMap,
      space,
    }) => {
      presenceMap.set(
        '1',
        createPresenceMessage('enter', {
          data: {
            profileUpdate: { id: 1, current: { name: 'Betty' } },
            locationUpdate: { id: null, current: { slide: 1 }, previous: null },
          },
        }),
      );

      const spy = vi.spyOn(presence, 'leave');
      await space.leave({ colorWhenLeft: 'blue' });
      expect(spy).toHaveBeenNthCalledWith(1, {
        profileUpdate: {
          id: 'NanoidID',
          current: { colorWhenLeft: 'blue' },
        },
        locationUpdate: {
          id: null,
          current: { slide: 1 },
          previous: null,
        },
      });
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

    it<SpaceTestContext>('is called when members enter', async ({ space, presenceMap }) => {
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

      const member2 = createSpaceMember({
        clientId: '2',
        connectionId: '2',
        lastEvent: { name: 'enter', timestamp: 1 },
        profileData: { name: 'Betty' },
      });

      expect(callbackSpy).toHaveBeenNthCalledWith(2, {
        members: [member1, member2],
      });
    });

    it<SpaceTestContext>('is called when members leave', async ({ space, presenceMap }) => {
      const callbackSpy = vi.fn();
      space.subscribe('update', callbackSpy);

      await createPresenceEvent(space, presenceMap, 'enter');
      let member = createSpaceMember({ lastEvent: { name: 'enter', timestamp: 1 } });

      expect(callbackSpy).toHaveBeenNthCalledWith(1, {
        members: [member],
      });

      await createPresenceEvent(space, presenceMap, 'leave');
      member = createSpaceMember({ isConnected: false, lastEvent: { name: 'leave', timestamp: 1 } });
      expect(callbackSpy).toHaveBeenNthCalledWith(2, {
        members: [member],
      });
    });

    it<SpaceTestContext>('is called when members location changes', async ({ space, presenceMap }) => {
      const callbackSpy = vi.fn();
      space.subscribe('update', callbackSpy);

      await createPresenceEvent(space, presenceMap, 'enter');
      let member = createSpaceMember({ lastEvent: { name: 'enter', timestamp: 1 } });
      expect(callbackSpy).toHaveBeenNthCalledWith(1, {
        members: [member],
      });

      await createPresenceEvent(space, presenceMap, 'update', {
        data: createLocationUpdate({ current: 'newLocation' }),
      });

      member = createSpaceMember({ lastEvent: { name: 'update', timestamp: 1 }, location: 'newLocation' });
      expect(callbackSpy).toHaveBeenNthCalledWith(2, {
        members: [member],
      });
    });

    it<SpaceTestContext>('accepts an async function', async ({ space, presenceMap }) => {
      const callbackSpy = vi.fn();
      space.subscribe('update', async (v) => callbackSpy(v));

      await createPresenceEvent(space, presenceMap, 'enter');
      expect(callbackSpy).toHaveBeenNthCalledWith(1, {
        members: [createSpaceMember({ lastEvent: { name: 'enter', timestamp: 1 } })],
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
