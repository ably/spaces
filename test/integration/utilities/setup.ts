import { Realtime } from 'ably';
import { nanoid } from 'nanoid';
import { createSandboxAblyAPIKey } from '../../lib/ablySandbox.js';
import Spaces from '../../../src/Spaces.js';
import { TestContext } from 'vitest';
import { Subset } from '../../../src/utilities/types.js';
import { SpaceOptions } from '../../../src/types.js';

/**
 * Fetches a key for the Ably sandbox environment. This key is shared between all callers of this function.
 */
const fetchSharedSandboxKey = (() => {
  const sandboxKeyPromise = createSandboxAblyAPIKey();

  return async () => {
    return await sandboxKeyPromise;
  };
})();

export async function assertTakesAtMost(milliseconds: number, context: TestContext, operation: () => Promise<void>) {
  const startTime = performance.now();
  await operation();
  const endTime = performance.now();
  context.expect(endTime).to.be.within(startTime, startTime + milliseconds);
}

/**
 * Performs the following part of a test setup:
 *
 * > Given a Spaces client `performerSpaces` and a Spaces client `observerSpaces`, both configured to use the same API key, and each configured to use a different randomly-generated client ID...
 */
export async function createClients() {
  const sandboxKey = await fetchSharedSandboxKey();

  const performerClientId = nanoid();
  const performerRealtime = new Realtime.Promise({
    environment: 'sandbox',
    key: sandboxKey,
    clientId: performerClientId,
  });
  const performerSpaces = new Spaces(performerRealtime);

  const observerClientId = nanoid();
  const observerRealtime = new Realtime.Promise({
    environment: 'sandbox',
    key: sandboxKey,
    clientId: observerClientId,
  });
  const observerSpaces = new Spaces(observerRealtime);

  return {
    performer: { spaces: performerSpaces, clientId: performerClientId },
    observer: { spaces: observerSpaces, clientId: observerClientId },
  };
}

/**
 * Given Spaces clients `performerSpaces` and `observerSpaces`, performs the following part of a test setup:
 *
 * > ...and Space instances `performerSpace` and `observerSpace`, fetched from `performerSpaces` and `observerSpaces` respectively using `#get` with a randomly-generated space name and the options `performerSpaceOptions` and `observerSpaceOptions` respectively...
 */
export async function getSpaceInstances({
  performerSpaces,
  performerSpaceOptions,
  observerSpaces,
  observerSpaceOptions,
}: {
  performerSpaces: Spaces;
  performerSpaceOptions?: Subset<SpaceOptions>;
  observerSpaces: Spaces;
  observerSpaceOptions?: Subset<SpaceOptions>;
}) {
  const spaceName = nanoid();

  const performerSpace = await performerSpaces.get(spaceName, performerSpaceOptions);
  const observerSpace = await observerSpaces.get(spaceName, observerSpaceOptions);

  return { performerSpace, observerSpace };
}
