import { it, describe, expect, vi, beforeEach } from 'vitest';
import { Realtime, Types } from 'ably/promises';

import Space from './Space.js';

import {
  createPresenceEvent,
  createPresenceMessage,
  createLocationUpdate,
  createSpaceMember,
} from './utilities/test/fakes.js';

interface SpaceTestContext {
  client: Types.RealtimePromise;
  space: Space;
  presence: Types.RealtimePresencePromise;
  presenceMap: Map<string, Types.PresenceMessage>;
}

vi.mock('ably/promises');
vi.mock('nanoid');

describe('Locations', () => {
  beforeEach<SpaceTestContext>((context) => {
    const client = new Realtime({});
    const presence = client.channels.get('').presence;
    const presenceMap = new Map();

    presenceMap.set('1', createPresenceMessage('enter', { clientId: 'MOCK_CLIENT_ID' }));
    presenceMap.set('2', createPresenceMessage('update', { clientId: '2', connectionId: '2' }));

    vi.spyOn(presence, 'get').mockImplementation(async () => {
      return Array.from(presenceMap.values());
    });

    context.client = client;
    context.space = new Space('test', client);
    context.presence = presence;
    context.presenceMap = presenceMap;
  });

  describe('set', () => {
    it<SpaceTestContext>('errors if setting location before entering the space', ({ space, presence }) => {
      // override presence.get() so the current member is not in presence
      vi.spyOn(presence, 'get').mockImplementation(async () => []);

      expect(() => space.locations.set('location1')).rejects.toThrowError();
    });

    it<SpaceTestContext>('sends a presence update on location set', async ({ space, presence }) => {
      const spy = vi.spyOn(presence, 'update');
      await space.locations.set('location1');
      expect(spy).toHaveBeenCalledWith(createLocationUpdate({ current: 'location1' }));
    });

    it<SpaceTestContext>('fires an event when a location is set', async ({ space, presenceMap }) => {
      const spy = vi.fn();
      space.locations.subscribe('update', spy);
      await createPresenceEvent(space, presenceMap, 'update', {
        data: createLocationUpdate({ current: 'location1' }),
      });
      expect(spy).toHaveBeenCalledOnce();
    });

    it<SpaceTestContext>('correctly sets previousLocation', async ({ space, presenceMap }) => {
      const spy = vi.fn();
      space.locations.subscribe('update', spy);

      await createPresenceEvent(space, presenceMap, 'update', {
        data: createLocationUpdate({ current: 'location1' }),
      });

      await createPresenceEvent(space, presenceMap, 'update', {
        data: createLocationUpdate({ current: 'location2', previous: 'location1', id: 'newId' }),
      });

      expect(spy).toHaveBeenLastCalledWith({
        member: createSpaceMember({ location: 'location2' }),
        currentLocation: 'location2',
        previousLocation: 'location1',
      });
    });

    it<SpaceTestContext>('maintains lock state in presence', async ({ space, presence, presenceMap }) => {
      presenceMap.set('1', createPresenceMessage('enter'));

      const lockID = 'test';
      const lockReq = await space.locks.acquire(lockID);

      const spy = vi.spyOn(presence, 'update');
      await space.locations.set('location');
      const extras = { locks: [lockReq] };
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ extras }));
    });
  });

  describe('location getters', () => {
    it<SpaceTestContext>('getSelf returns the location only for self', async ({ space, presenceMap }) => {
      await createPresenceEvent(space, presenceMap, 'update', {
        data: createLocationUpdate({ current: 'location1' }),
      });
      expect(space.locations.getSelf()).resolves.toEqual('location1');
    });

    it<SpaceTestContext>('getOthers returns the locations only for others', async ({ space, presenceMap }) => {
      await createPresenceEvent(space, presenceMap, 'update', {
        data: createLocationUpdate({ current: 'location1' }),
      });

      await createPresenceEvent(space, presenceMap, 'update', {
        connectionId: '2',
        data: createLocationUpdate({ current: 'location2' }),
      });

      const othersLocations = await space.locations.getOthers();
      expect(othersLocations).toEqual({ '2': 'location2' });
    });

    it<SpaceTestContext>('getAll returns the locations for self and others', async ({ space, presenceMap }) => {
      await createPresenceEvent(space, presenceMap, 'update', {
        data: createLocationUpdate({ current: 'location1' }),
      });

      await createPresenceEvent(space, presenceMap, 'update', {
        connectionId: '2',
        data: createLocationUpdate({ current: 'location2' }),
      });

      const allLocations = await space.locations.getAll();
      expect(allLocations).toEqual({ '1': 'location1', '2': 'location2' });
    });
  });
});
