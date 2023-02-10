import { it, describe, expect, vi, beforeEach } from 'vitest';
import Ably, { Types } from 'ably/promises';

import Space from './Space';

interface SpaceTestContext {
  client: Types.RealtimePromise;
}

vi.mock('ably/promises');

describe('Space (mockClient)', () => {
  beforeEach<SpaceTestContext>((context) => {
    context.client = new Ably.Realtime({});
  });

  describe('leave', () => {
    it<SpaceTestContext>('leaves a space successfully', async ({ client }) => {
      const spaceName = '_ably_space_test';
      const space = new Space('test', client);

      const presence = client.channels.get(spaceName).presence;
      const presenceLeaveSpy = vi.spyOn(presence, 'leave');

      await space.leave();
      expect(presenceLeaveSpy).toHaveBeenCalledOnce();
    });
  });
});
