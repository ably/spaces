import Space from '../../../src/Space';
import { HTMLElementManager, locationChangeHandlers } from './location-change-handlers';

export const addLocationTracking = (
  id: string,
  htmlElement: HTMLElement,
  htmlElementManager: HTMLElementManager,
  space: Space,
) => {
  const selectedTracker = space.locations.createTracker((locationChange) => locationChange.currentLocation === id);
  const unselectedTracker = space.locations.createTracker(
    (locationChange) => locationChange.previousLocation === id && locationChange.currentLocation !== id,
  );

  const { selectLocation, deselectLocation } = locationChangeHandlers(htmlElement, htmlElementManager, space);

  selectedTracker.on(selectLocation);

  unselectedTracker.on(deselectLocation);

  htmlElement.addEventListener('click', () => {
    space.locations.set(id);
  });
};
