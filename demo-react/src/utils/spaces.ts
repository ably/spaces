import Spaces from '@ably-labs/spaces';
import { Realtime } from 'ably';
import { nanoid } from 'nanoid';

const clientId = nanoid();

const ably = new Realtime.Promise({
  authUrl: `/api/ably-token-request?clientId=${clientId}`,
  clientId,
});

export const spaces = new Spaces(ably);
