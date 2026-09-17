import { it, describe, expect, expectTypeOf, vi, beforeEach } from 'vitest';
import { DefaultPubSubRealtimeClient, PubSubRealtimeClient } from '@ably/pubsub-core';

import Spaces, { type ClientWithOptions } from './Spaces.js';

interface SpacesTestContext {
  client: ClientWithOptions;
}

vi.mock('@ably/pubsub-core');

describe('Spaces', () => {
  beforeEach<SpacesTestContext>((context) => {
    context.client = new DefaultPubSubRealtimeClient({ key: 'asd' }) as ClientWithOptions;
  });

  it<SpacesTestContext>('expects the injected client to be of the type PubSubRealtimeClient', ({ client }) => {
    const spaces = new Spaces(client);
    expectTypeOf(spaces.client).toMatchTypeOf<PubSubRealtimeClient>();
  });

  it<SpacesTestContext>('creates and retrieves spaces successfully', async ({ client }) => {
    const channels = client.channels;
    const spy = vi.spyOn(channels, 'get');

    const spaces = new Spaces(client);
    await spaces.get('test');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenNthCalledWith(
      1,
      'test::$space',
      expect.objectContaining({
        params: expect.objectContaining({
          agent: expect.stringContaining('spaces'),
        }),
      }),
    );
  });

  it<SpacesTestContext>('applies the agent header to an existing SDK instance', ({ client }) => {
    const spaces = new Spaces(client);
    expect(client.options.agents).toEqual({
      spaces: spaces.version,
    });
  });

  it<SpacesTestContext>('extend the agents array when it already exists', ({ client }) => {
    (client as ClientWithOptions).options.agents = { 'some-client': '1.2.3' };
    const spaces = new Spaces(client);
    const ablyClient = spaces.client as ClientWithOptions;

    expect(ablyClient.options.agents).toEqual({
      'some-client': '1.2.3',
      spaces: spaces.version,
    });
  });
});
