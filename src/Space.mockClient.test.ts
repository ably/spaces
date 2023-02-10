import { it, describe, expect, vi, beforeEach, expectTypeOf } from 'vitest';
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
