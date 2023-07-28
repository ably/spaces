import { Types } from 'ably';

import type { CursorUpdate } from './Cursors.js';
import type { StrictCursorsOptions } from './options/CursorsOptions.js';

type ConnectionId = string;
type ConnectionsLastPosition = Record<ConnectionId, null | CursorUpdate>;

export default class CursorHistory {
  constructor() {}

  private positionsMissing(connections: ConnectionsLastPosition) {
    return Object.keys(connections).some((connectionId) => connections[connectionId] === null);
  }

  private messageToUpdate(
    connectionId: string,
    clientId: string,
    update: Pick<CursorUpdate, 'position' | 'data'>,
  ): CursorUpdate {
    return {
      clientId,
      connectionId,
      position: update.position,
      data: update.data,
    };
  }

  private allCursorUpdates(
    connections: ConnectionsLastPosition,
    page: Types.PaginatedResult<Types.Message>,
  ): ConnectionsLastPosition {
    return Object.fromEntries(
      Object.entries(connections).map(([connectionId, cursors]) => {
        const lastMessage = page.items.find((item) => item.connectionId === connectionId);
        if (!lastMessage) return [connectionId, cursors];

        const { data, clientId }: { data: CursorUpdate[] } & Pick<Types.Message, 'clientId'> = lastMessage;

        const lastUpdate =
          data?.length > 0 ? this.messageToUpdate(connectionId, clientId, data[data.length - 1]) : null;

        return [connectionId, lastUpdate];
      }),
    );
  }

  async getLastCursorUpdate(
    channel: Types.RealtimeChannelPromise,
    paginationLimit: StrictCursorsOptions['paginationLimit'],
  ): Promise<ConnectionsLastPosition> {
    const members = await channel.presence.get();

    if (members.length === 0) return {};

    let connections: ConnectionsLastPosition = members.reduce(
      (acc, member) => ({
        ...acc,
        [member.connectionId]: null,
      }),
      {},
    );
    const history = await channel.history();

    let pageNo = 1;
    let page = await history.current();
    connections = this.allCursorUpdates(connections, page);
    pageNo++;

    while (pageNo <= paginationLimit && this.positionsMissing(connections) && history.hasNext()) {
      page = await history.next();
      connections = this.allCursorUpdates(connections, page);
      pageNo++;
    }

    return connections;
  }
}
