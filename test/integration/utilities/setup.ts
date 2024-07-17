import { Realtime } from 'ably';
import { nanoid } from 'nanoid';
import { createSandboxAblyAPIKey } from '../../lib/ablySandbox.js';
import Spaces from '../../../src/Spaces.js';

/**
 * Fetches a key for the Ably sandbox environment. This key is shared between all callers of this function.
 */
const fetchSharedSandboxKey = (() => {
  const sandboxKeyPromise = createSandboxAblyAPIKey();

  return async () => {
    return await sandboxKeyPromise;
  };
})();

/**
 * Performs the following part of a test setup:
 *
 * > Given $count Spaces clients, all configured to use the same API key, and each configured to use a different randomly-generated client ID...
 */
export async function createClients({ count }: { count: number }) {
  const sandboxKey = await fetchSharedSandboxKey();

  return Array.from({ length: count }, () => {
    const clientId = nanoid();
    const realtime = new Realtime({
      environment: 'sandbox',
      key: sandboxKey,
      clientId: clientId,
    });
    const spaces = new Spaces(realtime);

    return { spaces: spaces, clientId: clientId };
  });
}
