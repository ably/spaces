import { it, describe, expect, vi, beforeEach } from 'vitest';
import Space, { SpaceMember } from './Space';
import Locations, { LocationChange } from './Locations';
import { LocationTrackerFunction } from './LocationTracker';
import { Realtime } from 'ably/promises';

interface LocationsTestContext {
  locations: Locations;
  spaceMember: SpaceMember;
}

vi.mock('ably/promises');

describe('LocationTracker', () => {
  beforeEach<LocationsTestContext>((context) => {
    const client = new Realtime({});

    const space = new Space('test', client);
    const locations = new Locations(space, (space as any).channel);
    context.locations = locations;

    const spaceMember = {
      clientId: '1',
      connections: ['1'],
      isConnected: true,
      profileData: {},
      location: null,
      lastEvent: { name: 'enter', timestamp: 1 },
    } as SpaceMember;
    context.spaceMember = spaceMember;
  });

  it<LocationsTestContext>('fires when a valid location event is fired', async (context) => {
    const locationTracker: LocationTrackerFunction<{ form: string }> = (change) => {
      console.log(change);
      return change.currentLocation?.form === 'settings';
    };
    const tracker = context.locations.createTracker(locationTracker);
    const spy = vi.fn();
    tracker.on(spy);
    context.locations.emit('locationUpdate', {
      member: context.spaceMember,
      previousLocation: {},
      currentLocation: {
        form: 'settings',
      },
    });
    expect(spy).toHaveBeenCalledOnce();
  });
});
