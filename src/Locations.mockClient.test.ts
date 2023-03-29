import { it, describe, expect, vi, beforeEach } from 'vitest';
import { Realtime, Types } from 'ably/promises';
import Space from './Space';
import { createPresenceMessage } from './utilities/test/fakes';

interface SpaceTestContext {
  client: Types.RealtimePromise;
  space: Space;
  presence: Types.RealtimePresencePromise;
}

vi.mock('ably/promises');

describe('Locations (mockClient)', () => {
  beforeEach<SpaceTestContext>((context) => {
    const client = new Realtime({});
    const presence = client.channels.get('').presence;

    context.client = client;
    context.space = new Space('test', client);
    context.presence = presence;
  });

  describe('set', () => {
    it<SpaceTestContext>('errors if setting location before entering the space', ({ space }) => {
      expect(() => space.locations.set('location1')).toThrowError();
    });

    it<SpaceTestContext>('sends a presence update on location set', async ({ client, space }) => {
      const presence = client.channels.get('').presence;
      vi.spyOn(presence, 'get').mockImplementationOnce(async () => [
        createPresenceMessage('enter', { clientId: 'MOCK_CLIENT_ID' }),
        createPresenceMessage('update', { clientId: '2', connectionId: '2' }),
      ]);
      const spy = vi.spyOn(presence, 'update');
      await space.enter();
      space.locations.set('location1');
      expect(spy).toHaveBeenCalledOnce();
    });
  });
});
