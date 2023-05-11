import { it, describe, expect, vi, beforeEach } from 'vitest';
import { Realtime, Types } from 'ably/promises';
import Space, { SpaceMember } from './Space.js';
import { clientConnection, createPresenceMessage } from './utilities/test/fakes.js';

interface SpaceTestContext {
  client: Types.RealtimePromise;
  space: Space;
  presence: Types.RealtimePresencePromise;
}

vi.mock('ably/promises');

describe('Locations (mockClient)', () => {
  beforeEach<SpaceTestContext>((context) => {
    const client = new Realtime({});
    client.connection = clientConnection;
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
      expect(() => space.locations.set('location1')).toThrowError();
    });

    it<SpaceTestContext>('sends a presence update on location set', async ({ space, presence }) => {
      const spy = vi.spyOn(presence, 'update');
      await space.enter();
      space.locations.set('location1');
      expect(spy).toHaveBeenCalledOnce();
    });

    it<SpaceTestContext>('fires an event when a location is set', async ({ space }) => {
      const spy = vi.fn();
      await space.enter();
      space.locations.on('locationUpdate', spy);
      space.locations['onPresenceUpdate'](
        createPresenceMessage('update', { clientId: '2', connectionId: '2', data: { location: 'location2' } }),
      );
      expect(spy).toHaveBeenCalledOnce();
    });

    it<SpaceTestContext>('correctly sets previousLocation', async ({ space }) => {
      const spy = vi.fn();
      await space.enter();
      space.locations.on('locationUpdate', spy);
      space.locations['onPresenceUpdate'](
        createPresenceMessage('update', { clientId: '2', connectionId: '2', data: { location: 'location1' } }),
      );
      space.locations['onPresenceUpdate'](
        createPresenceMessage('update', { clientId: '2', connectionId: '2', data: { location: 'location2' } }),
      );
      expect(spy).toHaveBeenLastCalledWith<{ member: SpaceMember; currentLocation: any; previousLocation: any }[]>({
        member: {
          clientId: '2',
          connectionId: '2',
          isConnected: true,
          profileData: { a: 1 },
          location: 'location2',
          lastEvent: { name: 'update', timestamp: 1 },
        },
        currentLocation: 'location2',
        previousLocation: 'location1',
      });
    });
  });
});
