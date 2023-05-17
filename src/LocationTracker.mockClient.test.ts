import { it, describe, expect, vi, beforeEach, Mock } from 'vitest';
import Space, { SpaceMember } from './Space';
import Locations, { LocationChange } from './Locations';
import LocationTracker, { LocationTrackerPredicate } from './LocationTracker';
import { Realtime } from 'ably/promises';
import { createPresenceMessage } from './utilities/test/fakes';
import { LOCATION_UPDATE } from './utilities/Constants';

const MOCK_CLIENT_ID = 'MOCK_CLIENT_ID';

interface LocationsTrackerTestContext {
  locations: Locations;
  spaceMember: SpaceMember;
  locationTracker: LocationTracker<{ form: string }>;
  validEvent: LocationChange<{ form: string }>;
  spy: Mock;
}

vi.mock('ably/promises');

describe('LocationTracker', () => {
  beforeEach<LocationsTrackerTestContext>((context) => {
    const client = new Realtime({});

    const presence = client.channels.get('').presence;

    vi.spyOn(presence, 'get').mockImplementationOnce(async () => [
      createPresenceMessage('enter', { clientId: 'MOCK_CLIENT_ID' }),
      createPresenceMessage('update', { clientId: '2', connectionId: '2' }),
    ]);

    const space = new Space('test', client);

    vi.spyOn(presence, 'update').mockImplementation(async (data) => {
      const members = (space as any).members;
      const location = members.findIndex((member) => member.clientId === MOCK_CLIENT_ID);
      const self = members[location];
      const updatedMember = {
        ...self,
        ...data,
      };
      (space as any).members = [...members.slice(0, location), updatedMember, ...members.slice(location + 1)];
    });

    const locations = new Locations(space, (space as any).channel);
    context.locations = locations;

    const spaceMember = {
      clientId: '1',
      connectionId: '1',
      isConnected: true,
      profileData: {},
      location: null,
      lastEvent: { name: 'enter', timestamp: 1 },
    } as SpaceMember;
    context.spaceMember = spaceMember;

    const locationTrackerPredicate: LocationTrackerPredicate<{ form: string }> = (change) => {
      return change.currentLocation?.form === 'settings';
    };
    const tracker = context.locations.createTracker<{ form: string }>(locationTrackerPredicate);

    context.locationTracker = tracker;

    const spy = vi.fn();
    context.spy = spy;

    context.validEvent = {
      member: spaceMember,
      previousLocation: {
        form: '',
      },
      currentLocation: {
        form: 'settings',
      },
    };
  });

  it<LocationsTrackerTestContext>('fires when a valid location event is fired', ({
    locationTracker,
    locations,
    validEvent,
    spy,
  }) => {
    locationTracker.on(spy);
    locations.emit(LOCATION_UPDATE, validEvent);
    expect(spy).toHaveBeenCalledOnce();
  });

  it<LocationsTrackerTestContext>('fires multiple times', ({ locationTracker, locations, validEvent, spy }) => {
    locationTracker.on(spy);
    locations.emit(LOCATION_UPDATE, validEvent);
    locations.emit(LOCATION_UPDATE, validEvent);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it<LocationsTrackerTestContext>('does not fire when a location event is fired but the predicate does not match', ({
    locationTracker,
    locations,
    spaceMember,
    spy,
  }) => {
    locationTracker.on(spy);
    locations.emit(LOCATION_UPDATE, {
      member: spaceMember,
      previousLocation: {},
      currentLocation: {
        form: 'advanced-options',
      },
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it<LocationsTrackerTestContext>('turns off through the LocationTracker and is not fired after that', ({
    locationTracker,
    locations,
    validEvent,
    spy,
  }) => {
    locationTracker.on(spy);
    locationTracker.off(spy);
    locations.emit(LOCATION_UPDATE, validEvent);
    expect(spy).not.toHaveBeenCalled();
  });

  it<LocationsTrackerTestContext>('does not turn off through the LocationTracker when a different LocationTracker event is turned off', ({
    locationTracker,
    locations,
    validEvent,
    spy,
  }) => {
    const secondSpy = vi.fn();
    locationTracker.on(spy);
    locationTracker.on(secondSpy);
    locationTracker.off(spy);
    locations.emit(LOCATION_UPDATE, validEvent);
    expect(spy).not.toHaveBeenCalled();
    expect(secondSpy).toHaveBeenCalledOnce();
  });

  it<LocationsTrackerTestContext>('returns a list of only the members that are in the correct location', async ({
    locationTracker,
    locations,
  }) => {
    expect(locationTracker.members()).toEqual([]);
    await locations.space.enter({});
    locations.set({
      form: 'settings',
    });
    expect(locationTracker.members()).toEqual([
      {
        clientId: 'MOCK_CLIENT_ID',
        connectionId: '1',
        isConnected: true,
        lastEvent: {
          name: 'enter',
          timestamp: 1,
        },
        location: {
          form: 'settings',
        },
        profileData: {},
      },
    ]);
  });
});
