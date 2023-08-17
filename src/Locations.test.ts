import { it, describe, expect, vi, beforeEach } from 'vitest';
import { Realtime, Types } from 'ably/promises';

import Space from './Space.js';

import { createPresenceMessage, createLocationUpdate, createSpaceMember } from './utilities/test/fakes.js';

interface SpaceTestContext {
  client: Types.RealtimePromise;
  space: Space;
  presence: Types.RealtimePresencePromise;
}

vi.mock('ably/promises');
vi.mock('nanoid');

describe('Locations', () => {
  beforeEach<SpaceTestContext>((context) => {
    const client = new Realtime({});
    const presence = client.channels.get('').presence;

    vi.spyOn(presence, 'get').mockImplementationOnce(async () => [
      createPresenceMessage('enter', { clientId: 'MOCK_CLIENT_ID' }),
      createPresenceMessage('update', { clientId: '2', connectionId: '2' }),
    ]);

    context.client = client;
    context.space = new Space('test', client);
    context.presence = presence;
  });

  describe('set', () => {
    it<SpaceTestContext>('errors if setting location before entering the space', ({ space }) => {
      expect(() => space.locations.set('location1')).rejects.toThrowError();
    });

    it<SpaceTestContext>('sends a presence update on location set', async ({ space, presence }) => {
      const spy = vi.spyOn(presence, 'update');
      await space.enter();
      await space.locations.set('location1');
      expect(spy).toHaveBeenCalledWith(createLocationUpdate({ current: 'location1' }));
    });

    it<SpaceTestContext>('fires an event when a location is set', async ({ space }) => {
      const spy = vi.fn();
      space.locations.subscribe('update', spy);
      await space['onPresenceUpdate'](
        createPresenceMessage('update', {
          data: createLocationUpdate({ current: 'location1' }),
        }),
      );
      expect(spy).toHaveBeenCalledOnce();
    });

    it<SpaceTestContext>('correctly sets previousLocation', async ({ space }) => {
      const spy = vi.fn();
      space.locations.subscribe('update', spy);

      await space['onPresenceUpdate'](
        createPresenceMessage('update', {
          data: createLocationUpdate({ current: 'location1' }),
        }),
      );

      await space['onPresenceUpdate'](
        createPresenceMessage('update', {
          data: createLocationUpdate({ current: 'location2', previous: 'location1', id: 'newId' }),
        }),
      );

      expect(spy).toHaveBeenLastCalledWith({
        member: createSpaceMember({ location: 'location2' }),
        currentLocation: 'location2',
        previousLocation: 'location1',
      });
    });
  });

  describe('location getters', () => {
    it<SpaceTestContext>('getSelf returns the location only for self', async ({ space }) => {
      await space['onPresenceUpdate'](
        createPresenceMessage('update', {
          data: createLocationUpdate({ current: 'location1' }),
        }),
      );
      expect(space.locations.getSelf()).resolves.toEqual('location1');
    });

    it<SpaceTestContext>('getOthers returns the locations only for others', async ({ space }) => {
      await space['onPresenceUpdate'](
        createPresenceMessage('update', { data: createLocationUpdate({ current: 'location1' }) }),
      );

      await space['onPresenceUpdate'](
        createPresenceMessage('update', {
          connectionId: '2',
          data: createLocationUpdate({ current: 'location2' }),
        }),
      );

      const othersLocations = await space.locations.getOthers();
      expect(othersLocations).toEqual({ '2': 'location2' });
    });

    it<SpaceTestContext>('getAll returns the locations for self and others', async ({ space }) => {
      await space['onPresenceUpdate'](
        createPresenceMessage('update', { data: createLocationUpdate({ current: 'location1' }) }),
      );

      await space['onPresenceUpdate'](
        createPresenceMessage('update', {
          connectionId: '2',
          data: createLocationUpdate({ current: 'location2' }),
        }),
      );

      const allLocations = await space.locations.getAll();
      expect(allLocations).toEqual({ '1': 'location1', '2': 'location2' });
    });
  });
});
