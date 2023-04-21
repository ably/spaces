import Space from '../../../src/Space';
import { HTMLElementManager, locationChangeHandlers } from './location-change-handlers';

const addLocationTracking = (
  id: string,
  htmlElement: HTMLElement,
  htmlElementManager: HTMLElementManager,
  space: Space,
) => {
  const selectedTracker = space.locations.createTracker<string>((locationChange) =>
    locationChange.currentLocation ? locationChange.currentLocation.startsWith(id) : false,
  );
  const unselectedTracker = space.locations.createTracker<string>(
    (locationChange) =>
      locationChange.previousLocation &&
      locationChange.previousLocation.startsWith(id) &&
      (!locationChange.currentLocation || !locationChange.currentLocation.startsWith(id)),
  );

  const { selectLocation, deselectLocation } = locationChangeHandlers(htmlElement, htmlElementManager, space);

  selectedTracker.on(selectLocation);

  unselectedTracker.on(deselectLocation);

  htmlElement.addEventListener('click', () => {
    space.locations.set(id);
  });
};

export { addLocationTracking };
