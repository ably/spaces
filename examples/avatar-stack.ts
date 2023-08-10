import Spaces from '@ably-labs/spaces';
import { Realtime } from 'ably';

import { renderAvatars, renderNotification } from './my-application';

// Create Ably client
const client = new Realtime.Promise({ authUrl: '<auth-endpoint>', clientId: '<client-ID>' });

// Initialize the Spaces SDK with an Ably client
const spaces = new Spaces(client);

// Create a new space
const space = await spaces.get('slide-deck-224');

// Enter a space to become a member
await space.enter({ name: 'Kyle' });

// Listen to the member changes within a space
// Triggers for members entering/ leaving a space or updating their profile
space.members.subscribe('update', () => {
  const otherMembers = space.members.getOthers();
  renderAvatars(otherMembers);
});

// Listen to leave events only to show a notification
space.members.subscribe('leave', (member) => {
  renderNotification('memberHasLeft', member);
});
