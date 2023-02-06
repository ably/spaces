import { it, describe, expect, expectTypeOf, beforeEach } from 'vitest';
import Ably, { Types } from 'ably/promises';
import Space from './Space';
import Spaces from './Spaces';

describe('Core Space API functionality', () => {
  it('Expects the injected client to be of the type RealtimePromise', () => {
    const ablyClient = new Ably.Realtime({
      key: 'abc:def',
    });
    const spaces = new Spaces(ablyClient);
    expectTypeOf(spaces.ably).toMatchTypeOf<Types.RealtimePromise>();
  });
  it('Connects successfully with the Ably Client', async () => {
    const ablyClient = new Ably.Realtime({
      key: 'abc:def',
    });
    const notConnected = await ablyClient.connection.whenState("disconnected");
    expect(notConnected.current).toBe('disconnected');
    const connectSuccess = await ablyClient.connection.whenState("connected");
    expect(connectSuccess.current).toBe('connected');
  });
});