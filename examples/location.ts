import Spaces from '@ably-labs/spaces';
import { Realtime } from 'ably';

import updateLocationsForMember from './my-application';

// Create Ably client
const client = new Realtime({ authUrl: '<auth-endpoint>', clientId: '<client-ID>' });

// Initialize the Spaces SDK with an Ably client
const spaces = new Spaces(client);

// Create a new space
const space = await spaces.get('slide-deck-224');

// Enter a space to become a member
await space.enter({ name: 'Amelie' });

// Subscribe to all members' location updates
space.locations.subscribe('update', ({ member, currentLocation, previousLocation }) => {
  // Update UI to reflect other members locations
  updateLocationsForMember(member, currentLocation, previousLocation);
});

// Set your location
await space.locations.set({ slide: 0, elementId: 'title' });
