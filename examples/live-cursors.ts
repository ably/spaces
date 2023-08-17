import Spaces from '@ably-labs/spaces';
import { Realtime } from 'ably';

import renderCursor from './my-application';

// Create Ably client
const client = new Realtime.Promise({ authUrl: '<auth-endpoint>', clientId: '<client-ID>' });

// Initialize the Spaces SDK with an Ably client
const spaces = new Spaces(client);

// Create a new space
const space = await spaces.get('slide-deck-224');

// Enter a space to become a member
space.enter({ name: 'Helmut' });

// Listen to all changes to all members within a space
space.cursors.subscribe('update', async (cursorUpdate) => {
  const members = await space.members.getAll();
  const member = members.find((member) => member.connectionId === cursorUpdate.connectionId);
  renderCursor(cursorUpdate, member);
});

// Publish cursor events to other members
window.addEventListener('mousemove', ({ clientX, clientY }) => {
  space.cursors.set({ position: { x: clientX, y: clientY } });
});
