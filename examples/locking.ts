import Spaces, { LockStatus } from '@ably/spaces';
import { Realtime } from 'ably';

import { enableLocationEditing, lockId } from './my-application';

// Create Ably client
const client = new Realtime({ authUrl: '<auth-endpoint>', clientId: '<client-ID>' });

// Initialize the Spaces SDK with an Ably client
const spaces = new Spaces(client);

// Create a new space
const space = await spaces.get('slide-deck-224');

// Enter a space to become a member
await space.enter({ name: 'Yoshi' });

const isLocked = space.locks.get(lockId);

if (!isLocked) {
  await space.locks.acquire(lockId);
}

// Update UI when parts of the UI are locked
space.locks.subscribe('update', async (lock) => {
  const self = await space.members.getSelf();

  if (lock.request.status === LockStatus.LOCKED && self.connectionId === lock.member.connectionId) {
    const location = {
      slide: lock.request.attributes.get('slide'),
      elementId: lock.request.attributes.get('elementId'),
    };
    enableLocationEditing({ location });
  }
});
