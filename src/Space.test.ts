import { it, describe, expect, beforeEach, afterEach } from 'vitest';
import { Realtime, Types } from 'ably/promises';
import { WebSocket } from 'mock-socket';

import Space from './Space';
import Server from './utilities/test/mock-server';
import defaultClientConfig from './utilities/test/default-client-config';
import {
  enterPresenceAction,
  getPresenceAction,
  createChannelAction,
} from './utilities/test/mock-server-action-responses';

interface SpaceTestContext {
  client: Types.RealtimePromise;
  server: Server;
}

describe('Space (mockSocket)', () => {
  beforeEach<SpaceTestContext>((context) => {
    (Realtime as any).Platform.Config.WebSocket = WebSocket;
    context.server = new Server('wss://realtime.ably.io/');
    context.client = new Realtime(defaultClientConfig);
  });

  afterEach<SpaceTestContext>((context) => {
    context.server.stop();
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
});
