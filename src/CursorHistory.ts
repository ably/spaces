import { Types } from 'ably';

import type { CursorUpdate } from './Cursors';

const PAGINATION_LIMIT = 5;

type LastPosition = null | CursorUpdate;
type CursorName = string;
type CursorsLastPostion = Record<CursorName, LastPosition>;
type ConnectionId = string;
type ConnectionsLastPosition = Record<ConnectionId, null | CursorUpdate | CursorsLastPostion>;

export default class CursorHistory {
  constructor(private channel: Types.RealtimeChannelPromise) {}

  private positionsMissing(connections: ConnectionsLastPosition) {
    return Object.keys(connections).some((connectionId) => connections[connectionId] === null);
  }

  private messageToUpdate(
    connectionId: string,
    clientId: string,
    cursorName: string,
    update: Pick<CursorUpdate, 'position' | 'data'>,
  ): CursorUpdate {
    return {
      name: cursorName,
      clientId,
      connectionId,
      position: update.position,
      data: update.data,
    };
  }

  private namedCursorUpdates(
    cursorName: CursorName,
    connections: ConnectionsLastPosition,
    page: Types.PaginatedResult<Types.Message>,
  ): ConnectionsLastPosition {
    return Object.fromEntries(
      Object.entries(connections).map(([connectionId, cursors]) => {
        if (cursors && cursors[cursorName]) return [connectionId, cursors[cursorName]];

        const lastMessage = page.items.find((item) => item.connectionId === connectionId);
        if (!lastMessage) return [connectionId, null];

        const { data, clientId }: Types.Message & { data: Record<CursorName, CursorUpdate[]> } = lastMessage;
        const updates: CursorUpdate[] = data[cursorName] || [];

        if (updates.length > 0) {
          const lastUpdate = updates[updates.length - 1];
          return [connectionId, this.messageToUpdate(connectionId, clientId, cursorName, lastUpdate)];
        } else {
          return [connectionId, null];
        }
      }),
    );
  }

  private allCursorUpdates(
    connections: ConnectionsLastPosition,
    page: Types.PaginatedResult<Types.Message>,
  ): ConnectionsLastPosition {
    return Object.fromEntries(
      Object.entries(connections).map(([connectionId, cursors]) => {
        const lastMessage = page.items.find((item) => item.connectionId === connectionId);
        if (!lastMessage) return [connectionId, cursors];

        const { data, clientId }: { data: Record<CursorName, CursorUpdate[]> } & Pick<Types.Message, 'clientId'> =
          lastMessage;

        const updatedCursors = Object.fromEntries(
          Object.entries(data).map(([cursorName, updates]) => {
            if (cursors && cursors[cursorName]) return [cursorName, cursors[cursorName]];

            if (updates.length > 0) {
              const lastUpdate = updates[updates.length - 1];
              return [cursorName, this.messageToUpdate(connectionId, clientId, cursorName, lastUpdate)];
            } else {
              return [cursorName, null];
            }
          }),
        );

        return [connectionId, updatedCursors];
      }),
    );
  }

  private mapPageToConnections(
    page: Types.PaginatedResult<Types.Message>,
    connections: ConnectionsLastPosition,
    cursorName?: string,
  ): ConnectionsLastPosition {
    return cursorName
      ? this.namedCursorUpdates(cursorName, connections, page)
      : this.allCursorUpdates(connections, page);
  }

  async getLastCursorUpdate(cursorName?: string): Promise<ConnectionsLastPosition> {
    const members = await this.channel.presence.get();

    if (members.length === 0) return {};

    let connections: ConnectionsLastPosition = members.reduce(
      (acc, member) => ({
        ...acc,
        [member.connectionId]: null,
      }),
      {},
    );
    const history = await this.channel.history();

    let pageNo = 1;
    let page = await history.current();
    connections = this.mapPageToConnections(page, connections, cursorName);
    pageNo++;

    while (pageNo <= PAGINATION_LIMIT && this.positionsMissing(connections) && history.hasNext()) {
      page = await history.next();
      connections = this.mapPageToConnections(page, connections, cursorName);
      pageNo++;
    }

    return connections;
  }
}

export { PAGINATION_LIMIT };
