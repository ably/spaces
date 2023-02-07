import { it, describe, expect, expectTypeOf, vi } from 'vitest';
import Ably from 'ably/promises';
import Space from './Space';
import { Server, WebSocket } from 'mock-socket';

describe('Functionality of Space instances', () => {
  it('Creates a space successfully with call to channel.get', () => {
    const client = new Ably.Realtime({
      key: 'abc:def',
    });
    const channels = client.channels;
    const channelSpy = vi.spyOn(channels, 'get');
    const space = new Space('test', client);
    expect(channelSpy).toHaveBeenCalledOnce();
    expect(channelSpy).toHaveBeenCalledWith('_ably_space_test');
    // Note: This is matching the class type. This is not a TypeScript type.
    expectTypeOf(space).toMatchTypeOf<Space>();
  });

  it('Enters the space successfully', async () => {
    (Ably.Realtime as any).Platform.Config.WebSocket = WebSocket;
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
        try {
          const obj = JSON.parse(m as string);
          if(obj.action === 10) {
            socket.send(JSON.stringify({"action":11,"flags":983041,"channel":"_ably_space_test","channelSerial":"108eMNtswBL6Ud51959078:-1"}));
            socket.send(JSON.stringify({"action":16,"channel":"_ably_space_test","channelSerial":"108rUpQvABKxWa69183736:","presence":[]}));
          }
          if(obj.action === 14) {
            const data = JSON.stringify(obj.presence[0].data);
            socket.send(JSON.stringify({"action":14,"id":"NU_ExvNktu:0","connectionId":"NU_ExvNktu","connectionSerial":0,"channel":"_ably_space_test","channelSerial":"108eMNtswBL6Ud51959078:3","timestamp":1675699722722,"presence":[{"id":"NU_ExvNktu:0:0","clientId":"T7we24YJhMvTDrxQC1pvH","connectionId":"NU_ExvNktu","timestamp":1675699722722,"encoding":"json","data": data,"action":2}]}))
          }
        } catch(e) {
          console.error(e);
        }
      })
    });

    const client = new Ably.Realtime({
      key: 'abc:def',
      useBinaryProtocol: false,
      log: {
        level: 4,
        handler: console.log,
      }
    });
    const space = new Space('test', client);
    space.enter({ name: 'John' });
    
    const channel = client.channels.get('_ably_space_test');

    let data: { name: string } = await new Promise((fulfill)=>{
      channel.presence.subscribe('enter', (d) => {
        fulfill(JSON.parse(d.data));
      });
    })
    expect(data.name).to.equal('John');
  });
});
