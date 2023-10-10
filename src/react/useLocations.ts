import { useContext, useEffect, useRef } from 'react';
import { SpaceContext } from './contexts/SpaceContext.js';
import { isArray, isFunction, isString } from '../utilities/is.js';

import type Locations from '../Locations.js';
import type { SpaceMember } from '../types.js';
import type { UseSpaceOptions } from './types.js';

interface UseLocationsResult {
  update?: Locations['set'];
}

type UseLocationCallback = (locationUpdate: { member: SpaceMember }) => void;

export type LocationsEvent = 'update';

function useLocations(callback?: UseLocationCallback, options?: UseSpaceOptions): UseLocationsResult;
function useLocations(
  event: LocationsEvent | LocationsEvent[],
  callback: UseLocationCallback,
  options?: UseSpaceOptions,
): UseLocationsResult;

/*
 * Registers a subscription on the `Space.locations` object
 */
function useLocations(
  eventOrCallback?: LocationsEvent | LocationsEvent[] | UseLocationCallback,
  callbackOrOptions?: UseLocationCallback | UseSpaceOptions,
  optionsOrNothing?: UseSpaceOptions,
): UseLocationsResult {
  const space = useContext(SpaceContext);
  const locations = space?.locations;

  const callback =
    isString(eventOrCallback) || isArray(eventOrCallback)
      ? (callbackOrOptions as UseLocationCallback)
      : eventOrCallback;

  const options = isFunction(callbackOrOptions) ? optionsOrNothing : callbackOrOptions;

  const callbackRef = useRef<UseLocationCallback | undefined>(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (callbackRef.current && locations && !options?.skip) {
      const listener: UseLocationCallback = (params) => {
        callbackRef.current?.(params);
      };
      if (isString(eventOrCallback)) {
        locations.subscribe(eventOrCallback, listener);
      } else {
        locations.subscribe(listener);
      }

      return () => {
        if (isString(eventOrCallback)) {
          locations.unsubscribe(eventOrCallback, listener);
        } else {
          locations.unsubscribe(listener);
        }
      };
    }
  }, [locations, options?.skip]);

  return {
    update: locations?.set.bind(locations),
  };
}

export { useLocations };