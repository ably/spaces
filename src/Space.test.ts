import { it, describe, expect, expectTypeOf, vi, beforeEach, afterEach } from 'vitest';
import sinon from 'sinon';
import Ably, { Types } from 'ably/promises';
import { WebSocket } from 'mock-socket';

import Space, { ERROR_CLIENT_NOT_PRESENT } from './Space';
import Server from './utilities/test/mock-server';
import defaultClientConfig from './utilities/test/default-client-config';
import {
  enterPresenceAction,
  getPresenceAction,
  createChannelAction,
} from './utilities/test/mock-server-action-responses';

const MOCK_CLIENT_ID = 'MOCK_CLIENT_ID';

interface SpaceTestContext {
  client: Types.RealtimePromise;
  server: Server;
}

interface SpaceMockClientTestContext {
  mockClient: Types.RealtimePromise;
}

const DEFAULT_PRESENCE_MESSAGE = {
  action: 'present',
  clientId: MOCK_CLIENT_ID,
  connectionId: 'CONNDESC',
  data: {},
  encoding: 'json',
  id: '123',
  timestamp: 123,
};

const mockPromisify = <T>(expectedReturnValue): Promise<T> => new Promise((resolve) => resolve(expectedReturnValue));
const methodReturningVoidPromise = () => mockPromisify<void>((() => {})());
const mockChannelStateChange = mockPromisify<Types.ChannelStateChange>({
  current: 'attached',
  previous: 'attached',
  resumed: false,
});

describe('Space', () => {
  beforeEach<SpaceTestContext>((context) => {
    (Ably.Realtime as any).Platform.Config.WebSocket = WebSocket;
    context.server = new Server('wss://realtime.ably.io/');
    context.client = new Ably.Realtime(defaultClientConfig);
  });

  afterEach<SpaceTestContext>((context) => {
    context.server.stop();
  });

  beforeEach<SpaceMockClientTestContext>((context) => {
    const mockClient = sinon.mock(new Ably.Realtime(defaultClientConfig));

    const mockPresence = {
      get: () => mockPromisify<Types.PresenceMessage[]>([]),
      history: () =>
        mockPromisify<Types.PaginatedResult<Types.PresenceMessage>>({
          items: [DEFAULT_PRESENCE_MESSAGE],
          first: () => {},
          next: () => {},
          current: () => {},
          hasNext: () => true,
          isLast: () => false,
        }),
      subscribe: methodReturningVoidPromise,
      enter: methodReturningVoidPromise,
      update: methodReturningVoidPromise,
      leave: methodReturningVoidPromise,
      enterClient: methodReturningVoidPromise,
      updateClient: methodReturningVoidPromise,
      leaveClient: methodReturningVoidPromise,
      unsubscribe: methodReturningVoidPromise,
      syncComplete: true,
    };

    const mockChannel: Types.RealtimeChannelPromise = {
      presence: mockPresence,
      attach: methodReturningVoidPromise,
      detach: methodReturningVoidPromise,
      history: () =>
        mockPromisify<Types.PaginatedResult<Types.Message>>({
          items: [],
          first: () => {},
          next: () => {},
          current: () => {},
          hasNext: () => false,
          isLast: () => true,
        }),
      setOptions: methodReturningVoidPromise,
      subscribe: methodReturningVoidPromise,
      publish: methodReturningVoidPromise,
      whenState: () => mockChannelStateChange,
      name: 'MOCK_CHANNEL',
      errorReason: { code: 10000, message: 'Mock Error Info', statusCode: 200 },
      state: 'attached',
      params: {},
      modes: [],
      unsubscribe: methodReturningVoidPromise,
      on: methodReturningVoidPromise,
      off: methodReturningVoidPromise,
      once: () => mockChannelStateChange,
      listeners: () => null,
    };

    context.mockClient = {
      clientId: MOCK_CLIENT_ID,
      channels: {
        get: () => mockChannel,
        release: () => {},
      },
      auth: {
        clientId: MOCK_CLIENT_ID,
        ...mockClient.auth,
      },
      ...mockClient,
    };
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

  describe('enter', () => {
    it<SpaceTestContext>('enters a space successfully', async ({ client, server }) => {
      const spaceName = '_ably_space_test';
      const actionsOverride = {
        channel: spaceName,
      };

      server.onAction(10, createChannelAction(actionsOverride));
      server.onAction(10, getPresenceAction(actionsOverride));
      server.onActionCallback(14, (msg) => {
        const data = JSON.stringify(msg.presence[0].data);

        return enterPresenceAction({
          ...actionsOverride,
          presence: [
            {
              ...enterPresenceAction({}).presence[0],
              data,
            },
          ],
        });
      });

      server.start();

      const spaceData = { name: 'John' };
      const space = new Space('test', client);
      space.enter(spaceData);

      const channel = client.channels.get(spaceName);

      const data: { name: string } = await new Promise((fulfill) => {
        channel.presence.subscribe('enter', (d) => fulfill(JSON.parse(d.data)));
      });

      expect(data).toEqual(spaceData);
    });
  });

  describe('leave', () => {
    it<SpaceMockClientTestContext>('leaves a space successfully', ({ mockClient }) => {
      const spaceName = '_ably_space_test';

      const space = new Space('test', mockClient);
      const presence = mockClient.channels.get(spaceName).presence;
      presence.get = vi.fn().mockResolvedValueOnce([DEFAULT_PRESENCE_MESSAGE]);
      const presenceLeaveSpy = vi.spyOn(presence, 'leave');
      space.leave({}).then(() => {
        expect(presenceLeaveSpy).toHaveBeenCalledOnce();
      });
    });

    it<SpaceMockClientTestContext>('throws an error when a space has not been entered', ({ mockClient }) => {
      const space = new Space('test', mockClient);
      space
        .leave({})
        .then()
        .catch((reason) => expect(reason).toEqual(new Error(ERROR_CLIENT_NOT_PRESENT)));
    });
  });
});
