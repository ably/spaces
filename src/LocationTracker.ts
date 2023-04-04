import Locations, { LocationChange } from './Locations.js';

export type LocationTrackerFunction<T> = (locationChange: LocationChange<T>) => boolean;

export default class LocationTracker<T> {
  #locations: Locations;
  #locationTrackerFunction: LocationTrackerFunction<T>;

  #locationListenerWrappers: Map<Function, Function>;

  constructor(locations: Locations, locationTrackerFunction: LocationTrackerFunction<T>) {
    this.#locations = locations;
    this.#locationTrackerFunction = locationTrackerFunction;
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

  on(listener: Function): void {
    const self = this;
    const listenerWrapper = function () {
      const maybeChange: unknown = arguments[0];
      const shouldFire = self.#isChange(maybeChange) && self.#locationTrackerFunction(maybeChange);
      console.log(maybeChange);
      console.log(self.#isChange(maybeChange));
      if (!shouldFire) {
        return;
      }
      listener(arguments);
    };
    this.#locationListenerWrappers.set(listener, listenerWrapper);
    this.#locations.on('locationUpdate', listenerWrapper);
  }

  off(listener: Function): void {
    const actualListener = this.#locationListenerWrappers.get(listener);
    this.#locations.off(actualListener);
  }
}
