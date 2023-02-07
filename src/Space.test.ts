import { it, describe, expect, expectTypeOf, vi, beforeEach, afterEach } from 'vitest';
import { Types, Realtime } from 'ably/promises';
import { WebSocket } from 'mock-socket';

import Space, { MemberUpdateEvent, SpaceMember } from './Space';
import Server from './utilities/test/mock-server';
import defaultClientConfig from './utilities/test/default-client-config';
import {
  enterPresenceAction,
  getPresenceAction,
  createChannelAction,
  TEST_ENTER_PRESENCE_TIMESTAMP,
} from './utilities/test/mock-server-action-responses';

interface SpaceTestContext {
  client: Types.RealtimePromise;
  server: Server;
}

describe('Space', () => {
  beforeEach<SpaceTestContext>((context) => {
    (Realtime as any).Platform.Config.WebSocket = WebSocket;
    context.server = new Server('wss://realtime.ably.io/');
    context.client = new Realtime(defaultClientConfig);
  });

  afterEach<SpaceTestContext>((context) => {
    context.server.stop();
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

  describe('addEventListener', ()=>{
    it<SpaceTestContext>('fires an event when a user enters the space', async ({ client, server })=>{
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

      const data: SpaceMember[] = await new Promise((fulfill) => {
        space.addEventListener('memberUpdate', (event: Event) => {
          const members = (event as MemberUpdateEvent).members;
          fulfill(members);
        })
      });

      expect(data[0]).toEqual({
        "clientId": client.auth.clientId,
        "data":  {
        "lastEvent": {
          "event": "enter",
          "timestamp": TEST_ENTER_PRESENCE_TIMESTAMP,
        },
        "name": "John",
      },
      "isConnected": true,
    });
    })
  })
});
