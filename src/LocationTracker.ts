import Locations, { LocationChange } from './Locations.js';
import { SpaceMember } from './Space.js';
import { EventListener } from './utilities/EventEmitter.js';

/**
 * Responds to a locationChange with:
 * - `true` if the change should trigger an event to fire
 * - `false` if the change should not trigger an event to fire
 *
 * @param {LocationChange<T>} locationChange
 * @return {boolean}
 */
export type LocationTrackerPredicate<T> = (locationChange: LocationChange<T>) => boolean;

/** Class that enables tracking and responding to changes on specific location changes. */
export default class LocationTracker<T> {
  private locationListenerWrappers: Map<EventListener<T>, EventListener<LocationChange<T>>>;

  /**
   * Create a LocationTracker
   * @param {Locations} locations
   * @param {LocationTrackerPredicate<T>} locationTrackerPredicate
   */
  constructor(private locations: Locations, private locationTrackerPredicate: LocationTrackerPredicate<T>) {
    this.locationListenerWrappers = new Map();
  }

  /**
   * Detects if an object exists and has the same properties as a LocationChange object.
   * Does not detect if the object has any additional properties.
   *
   * @param {LocationChange<T>|unknown} maybeChange
   * @returns {boolean}
   */
  private isChange(maybeChange: LocationChange<T> | unknown): maybeChange is LocationChange<T> {
    if (!maybeChange) {
      return false;
    }
    return (
      (maybeChange as LocationChange<T>).member !== undefined &&
      (maybeChange as LocationChange<T>).previousLocation !== undefined &&
      (maybeChange as LocationChange<T>).currentLocation !== undefined
    );
  }

  /**
   * Assigns an event listener to fire if a `locationUpdate` event is fired from
   * the locations value of this class, and if the `locationTrackerPredicate`
   * returns true for the change associated with the `locationUpdate`.
   *
   * @param {EventListener<any>} listener
   * @return {void}
   */
  on(listener: EventListener<any>): void {
    const listenerWrapper = (maybeChange?: LocationChange<T>) => {
      const shouldFire = this.isChange(maybeChange) && this.locationTrackerPredicate(maybeChange);
      if (!shouldFire) {
        return;
      }
      listener(maybeChange);
    };
    this.locationListenerWrappers.set(listener, listenerWrapper);
    this.locations.on('locationUpdate', listenerWrapper);
  }

  /**
   * Unassigns an event listener that has been created through this class.
   *
   * @param {EventListener<any>} listener
   * @return {void}
   */
  off(listener: EventListener<any>): void {
    const actualListener = this.locationListenerWrappers.get(listener);
    this.locations.off(actualListener);
  }

  /**
   * Returns a list of all the members of the current Space that also
   * have a valid `currentLocation` for the LocationTrackerPredicate.
   *
   * @returns {SpaceMember[]}
   */
  members(): SpaceMember[] {
    const allMembers = this.locations.space.getMembers();
    return allMembers.filter((member) =>
      this.locationTrackerPredicate({
        member,
        previousLocation: {},
        currentLocation: member.location,
      }),
    );
  }
}
