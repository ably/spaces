import { it, describe, expect, vi, beforeEach, afterEach } from 'vitest';
import { Types, Realtime } from 'ably/promises';

import Space from './Space.js';

import { createPresenceEvent, createSpaceMember, createProfileUpdate } from './utilities/test/fakes.js';

interface SpaceTestContext {
  client: Types.RealtimePromise;
  space: Space;
  presence: Types.RealtimePresencePromise;
  presenceMap: Map<string, Types.PresenceMessage>;
}

vi.mock('ably/promises');
vi.mock('nanoid');

describe('Members', () => {
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

  describe('subscribe', () => {
    it<SpaceTestContext>('calls enter and update on enter presence events', async ({ space, presenceMap }) => {
      const updateSpy = vi.fn();
      const enterSpy = vi.fn();
      space.members.subscribe('update', updateSpy);
      space.members.subscribe('enter', enterSpy);

      await createPresenceEvent(space, presenceMap, 'enter');

      const member1 = createSpaceMember({ lastEvent: { name: 'enter', timestamp: 1 } });
      expect(updateSpy).toHaveBeenNthCalledWith(1, member1);
      expect(enterSpy).toHaveBeenNthCalledWith(1, member1);

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

      expect(updateSpy).toHaveBeenNthCalledWith(2, member2);
      expect(enterSpy).toHaveBeenNthCalledWith(2, member2);
    });

    it<SpaceTestContext>('calls updateProfile and update on update presence events', async ({ space, presenceMap }) => {
      const updateSpy = vi.fn();
      const updateProfileSpy = vi.fn();
      space.members.subscribe('update', updateSpy);
      space.members.subscribe('updateProfile', updateProfileSpy);

      await createPresenceEvent(space, presenceMap, 'enter');
      expect(updateSpy).toHaveBeenNthCalledWith(1, createSpaceMember({ lastEvent: { name: 'enter', timestamp: 1 } }));

      await createPresenceEvent(space, presenceMap, 'update', {
        data: createProfileUpdate({ current: { name: 'Betty' } }),
      });

      const memberUpdate = createSpaceMember({ profileData: { name: 'Betty' } });
      expect(updateSpy).toHaveBeenNthCalledWith(2, memberUpdate);
      expect(updateProfileSpy).toHaveBeenNthCalledWith(1, memberUpdate);
    });

    it<SpaceTestContext>('updates the connected status of clients who have left', async ({ space, presenceMap }) => {
      const updateSpy = vi.fn();
      const leaveSpy = vi.fn();
      space.members.subscribe('update', updateSpy);
      space.members.subscribe('leave', leaveSpy);

      await createPresenceEvent(space, presenceMap, 'enter');
      expect(updateSpy).toHaveBeenNthCalledWith(1, createSpaceMember({ lastEvent: { name: 'enter', timestamp: 1 } }));

      await createPresenceEvent(space, presenceMap, 'leave');
      const memberUpdate = createSpaceMember({ isConnected: false, lastEvent: { name: 'leave', timestamp: 1 } });
      expect(updateSpy).toHaveBeenNthCalledWith(2, memberUpdate);
      expect(leaveSpy).toHaveBeenNthCalledWith(1, memberUpdate);
    });

    describe('leavers', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it<SpaceTestContext>('removes a member who has left after the offlineTimeout', async ({ space, presenceMap }) => {
        const leaveSpy = vi.fn();
        const removeSpy = vi.fn();
        space.members.subscribe('leave', leaveSpy);
        space.members.subscribe('remove', removeSpy);

        await createPresenceEvent(space, presenceMap, 'enter');
        await createPresenceEvent(space, presenceMap, 'leave');

        const memberUpdate = createSpaceMember({ isConnected: false, lastEvent: { name: 'leave', timestamp: 1 } });
        expect(leaveSpy).toHaveBeenNthCalledWith(1, memberUpdate);

        await vi.advanceTimersByTimeAsync(130_000);

        expect(removeSpy).toHaveBeenNthCalledWith(1, memberUpdate);
      });

      it<SpaceTestContext>('does not remove a member that has rejoined', async ({ space, presenceMap }) => {
        const callbackSpy = vi.fn();
        space.members.subscribe('update', callbackSpy);

        await createPresenceEvent(space, presenceMap, 'enter');
        expect(callbackSpy).toHaveBeenNthCalledWith(
          1,
          createSpaceMember({ lastEvent: { name: 'enter', timestamp: 1 } }),
        );
        await createPresenceEvent(space, presenceMap, 'enter', { clientId: '2', connectionId: '2' });
        expect(callbackSpy).toHaveBeenNthCalledWith(
          2,
          createSpaceMember({ clientId: '2', connectionId: '2', lastEvent: { name: 'enter', timestamp: 1 } }),
        );

        await createPresenceEvent(space, presenceMap, 'leave');
        expect(callbackSpy).toHaveBeenNthCalledWith(
          3,
          createSpaceMember({ lastEvent: { name: 'leave', timestamp: 1 }, isConnected: false }),
        );

        await vi.advanceTimersByTimeAsync(60_000);
        await createPresenceEvent(space, presenceMap, 'enter');

        expect(callbackSpy).toHaveBeenNthCalledWith(
          4,
          createSpaceMember({ lastEvent: { name: 'enter', timestamp: 1 } }),
        );

        await vi.advanceTimersByTimeAsync(130_000); // 2:10 passed, default timeout is 2 min
        expect(callbackSpy).toHaveBeenCalledTimes(4);
      });

      it<SpaceTestContext>('unsubscribes when unsubscribe is called', async ({ space, presenceMap }) => {
        const spy = vi.fn();
        space.members.subscribe('update', spy);
        await createPresenceEvent(space, presenceMap, 'enter', { clientId: '2' });
        space.members.unsubscribe('update', spy);
        await createPresenceEvent(space, presenceMap, 'enter', { clientId: '2' });

        expect(spy).toHaveBeenCalledOnce();
      });

      it<SpaceTestContext>('unsubscribes when unsubscribe is called with no arguments', async ({
        space,
        presenceMap,
      }) => {
        const spy = vi.fn();
        space.members.subscribe('update', spy);
        await createPresenceEvent(space, presenceMap, 'enter', { clientId: '2' });
        space.members.unsubscribe();
        await createPresenceEvent(space, presenceMap, 'enter', { clientId: '2' });

        expect(spy).toHaveBeenCalledOnce();
      });
    });
  });
});
