import Spaces from '@ably-labs/spaces';
import { Realtime } from 'ably';
import { nanoid } from 'nanoid';

const clientId = nanoid();
const client = new Realtime.Promise({ key: process.env.REACT_APP_ABLY_API_KEY, clientId });
export const spaces = new Spaces(client);
