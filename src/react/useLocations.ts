import { useContext, useEffect, useRef } from 'react';
import { SpaceContext } from './contexts/SpaceContext.js';
import { isFunction } from '../utilities/is.js';

import type Locations from '../Locations.js';
import type { SpaceMember } from '../types.js';
import type { UseSpaceOptions } from './types.js';
import type { Space } from '../';

interface UseLocationsResult {
  space?: Space;
  update?: Locations['set'];
}

type UseLocationCallback = (locationUpdate: { member: SpaceMember }) => void;

function useLocations(options?: UseSpaceOptions): UseLocationsResult;
function useLocations(callback: UseLocationCallback, options?: UseSpaceOptions): UseLocationsResult;

/*
 * Registers a subscription on the `Space.locations` object
 */
function useLocations(
  callbackOrOptions?: UseLocationCallback | UseSpaceOptions,
  optionsOrNothing?: UseSpaceOptions,
): UseLocationsResult {
  const space = useContext(SpaceContext);
  const locations = space?.locations;

  const callback = isFunction(callbackOrOptions) ? (callbackOrOptions as UseLocationCallback) : undefined;

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
      locations.subscribe(listener);

      return () => {
        locations.unsubscribe(listener);
      };
    }
  }, [locations, options?.skip]);

  return {
    space,
    update: locations?.set.bind(locations),
  };
}

export { useLocations };
