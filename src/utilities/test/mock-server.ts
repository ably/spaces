import { Server as MockSocketServer, WebSocket } from 'mock-socket';
import Ably from 'ably/promises';

import { authAction } from './mock-server-action-responses';

class Server extends MockSocketServer {
  public onActionCallbacks: Function[];

  constructor(url) {
    (Ably.Realtime as any).Platform.Config.WebSocket = WebSocket;
    super(url);
    this.onActionCallbacks = [];
  }

  onAction(actionCode, data) {
    this.onActionCallbacks.push((msg, socket) => {
      this.sendMatchingSocketResponse(msg, socket, actionCode, () => data);
    });
  }

  onActionCallback(actionCode, callback) {
    this.onActionCallbacks.push((msg, socket) => {
      this.sendMatchingSocketResponse(msg, socket, actionCode, (parsedMsg) => callback(parsedMsg));
    });
  }

  private sendMatchingSocketResponse(msg, socket, actionCode, callback) {
    const parsedMsg = JSON.parse(msg);

    if (parsedMsg.action === actionCode) {
      socket.send(JSON.stringify(callback(parsedMsg)));
    }
  }

  start() {
    this.on('connection', (socket) => {
      socket.send(JSON.stringify(authAction({})));

      socket.on('message', (msg) => {
        this.onActionCallbacks.forEach((cb) => cb(msg, socket));
      });
    });
  }
}

export default Server;
