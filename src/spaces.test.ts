import { it, describe, expect, expectTypeOf, beforeEach } from 'vitest';
import Ably, { Types } from 'ably/promises';
import Space from './Space';
import Spaces from './Spaces';
import { Server, WebSocket } from 'mock-socket';

describe('Core Space API functionality', () => {
  it('Expects the injected client to be of the type RealtimePromise', () => {
    const ablyClient = new Ably.Realtime({
      key: 'abc:def',
    });
    const spaces = new Spaces(ablyClient);
    expectTypeOf(spaces.ably).toMatchTypeOf<Types.RealtimePromise>();
  });
  it('Connects successfully with the Ably Client', async () => {
    Ably.Realtime.Platform.Config.WebSocket = WebSocket;
    const server = new Server('wss://realtime.ably.io/');
    server.on('connection', (socket)=>{
      socket.send(JSON.stringify({
        "action": 4,
        "connectionId": "CONNDESC",
        "connectionKey": "CONNECTIONKEY",
        "connectionSerial": -1,
        "connectionDetails": {
          "clientId": "RND-CLIENTID",
          "connectionKey": "randomKey",
          "maxMessageSize": 131000,
          "maxInboundRate": 1000,
          "maxOutboundRate": 1000,
          "maxFrameSize": 262144,
          "connectionStateTtl": 120000,
          "maxIdleInterval": 15000
        }
      }))
      socket.on('message', (m)=>{
        console.log(m);
      })
    })
    const ablyClient = new Ably.Realtime({
      key: 'abc:def',
      useBinaryProtocol: false,
      log: {
        level: 4,
        handler: console.log,
      }
    });
    const connectSuccess = await ablyClient.connection.whenState("connected");
    expect(connectSuccess.current).toBe('connected');
  });
});
