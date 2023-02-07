import { it, describe, expect, expectTypeOf, vi, beforeEach, afterEach } from 'vitest';
import { Types, Realtime } from 'ably/promises';
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
    expectTypeOf(spaces.client).toMatchTypeOf<Types.RealtimePromise>();
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

    const sameSpace = spaces.get('test');
    expect(space).toBe(sameSpace);
  });

  it<SpacesTestContext>('fails to retrieve a space when a non-string is provided', ({ client }) => {
    const spaces = new Spaces(client);
    expect(() => spaces.get('')).toThrowError();
  });
});
