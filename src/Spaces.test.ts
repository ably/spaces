import { it, describe, expect, expectTypeOf, vi, beforeEach, afterEach } from 'vitest';
import { Realtime, Types } from 'ably/promises';
import { WebSocket } from 'mock-socket';

import Space from './Space';
import Spaces from './Spaces';

import Server from './utilities/test/mock-server';
import defaultClientConfig from './utilities/test/default-client-config';

interface SpacesTestContext {
  client: Types.RealtimePromise;
  server: Server;
}

describe('Spaces', () => {
  beforeEach<SpacesTestContext>((context) => {
    (Realtime as any).Platform.Config.WebSocket = WebSocket;
    context.server = new Server('wss://realtime.ably.io/');
    context.client = new Realtime(defaultClientConfig);
  });

  afterEach<SpacesTestContext>((context) => {
    context.server.stop();
  });

  it<SpacesTestContext>('expects the injected client to be of the type RealtimePromise', ({ client }) => {
    const spaces = new Spaces(client);
    expectTypeOf(spaces.ably).toMatchTypeOf<Types.RealtimePromise>();
  });

  it<SpacesTestContext>('connects successfully with the Ably Client', async ({ client, server }) => {
    server.start();
    const connectSuccess = await client.connection.whenState('connected');
    expect(connectSuccess.current).toBe('connected');
  });

  it<SpacesTestContext>('creates and retrieves spaces successfully', ({ client }) => {
    const channels = client.channels;
    const spy = vi.spyOn(channels, 'get');
    const spaces = new Spaces(client);
    const space = spaces.get('test');

    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith('_ably_space_test');
    // Note: This is matching the class type. This is not a TypeScript type.
    expectTypeOf(space).toMatchTypeOf<Space>();
  });

  it<SpacesTestContext>('creates a client with default options when a key is passed in', () => {
    const spaces = new Spaces(defaultClientConfig.key);
    expect(spaces.ably['options'].key).toEqual(defaultClientConfig.key);
  });

  it<SpacesTestContext>('creates a client with options that are passed in', () => {
    const spaces = new Spaces({ ...defaultClientConfig });
    expect(spaces.ably['options']).toContain(defaultClientConfig);
  });

  it<SpacesTestContext>('applies the agent header to an existing SDK instance', ({ client }) => {
    const spaces = new Spaces(client);
    expect((client as any).options.agents).toEqual([`ably-spaces/${spaces.version}`, 'space-custom-client']);
  });

  it<SpacesTestContext>('applies the agent header when options are passed in', () => {
    const spaces = new Spaces(defaultClientConfig);
    expect(spaces.ably['options'].agents).toEqual([`ably-spaces/${spaces.version}`, 'space-default-client']);
  });

  it<SpacesTestContext>('extend the agents array when it already exists', () => {
    const spaces = new Spaces({
      ...defaultClientConfig,
      agents: ['some-client/1.2.3'],
    } as any);
    expect(spaces.ably['options'].agents).toEqual([
      'some-client/1.2.3',
      `ably-spaces/${spaces.version}`,
      'space-default-client',
    ]);
  });
});
