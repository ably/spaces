import Locations, { LocationChange } from './Locations.js';
import { SpaceMember } from './Space.js';
import { EventListener } from './utilities/EventEmitter.js';

export type LocationTrackerPredicate<T> = (locationChange: LocationChange<T>) => boolean;

export default class LocationTracker<T> {
  #locations: Locations;
  #locationTrackerPredicate: LocationTrackerPredicate<T>;

  #locationListenerWrappers: Map<EventListener<any>, EventListener<any>>;

  constructor(locations: Locations, locationTrackerPredicate: LocationTrackerPredicate<T>) {
    this.#locations = locations;
    this.#locationTrackerPredicate = locationTrackerPredicate;
    this.#locationListenerWrappers = new Map();
  }

  #isChange(maybeChange: LocationChange<T> | unknown): maybeChange is LocationChange<T> {
    if (!maybeChange) {
      return false;
    }
    return (
      (maybeChange as LocationChange<T>).member !== undefined &&
      (maybeChange as LocationChange<T>).previousLocation !== undefined &&
      (maybeChange as LocationChange<T>).currentLocation !== undefined
    );
  }

  on(listener: EventListener<any>): void {
    const listenerWrapper = (maybeChange?: LocationChange<T>) => {
      const shouldFire = this.#isChange(maybeChange) && this.#locationTrackerPredicate(maybeChange);
      if (!shouldFire) {
        return;
      }
      listener(maybeChange);
    };
    this.#locationListenerWrappers.set(listener, listenerWrapper);
    this.#locations.on('locationUpdate', listenerWrapper);
  }

  off(listener: EventListener<any>): void {
    const actualListener = this.#locationListenerWrappers.get(listener);
    this.#locations.off(actualListener);
  }

  members(): SpaceMember[] {
    const allMembers = this.#locations.space.getMembers();
    return allMembers.filter((member) =>
      this.#locationTrackerPredicate({
        member,
        previousLocation: {},
        currentLocation: member.location,
      }),
    );
  }
}
