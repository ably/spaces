import { useEffect, useRef } from 'react';
import { isArray, isFunction, isString } from '../utilities/is.js';
import { useSpace, type UseSpaceResult } from './useSpace.js';

import type { EventKey } from '../utilities/EventEmitter.js';
import type { UseSpaceOptions } from './types.js';
import type { LockEventMap } from '../Locks.js';
import type { Lock } from '../types.js';

type LocksEvent = EventKey<LockEventMap>;

type UseLocksCallback = (params: Lock) => void;

/*
 * Registers a subscription on the `Space.locks` object
 */
function useLocks(callback?: UseLocksCallback, options?: UseSpaceOptions): UseSpaceResult;
function useLocks(
  event: LocksEvent | LocksEvent[],
  callback: UseLocksCallback,
  options?: UseSpaceOptions,
): UseSpaceResult;
function useLocks(
  eventOrCallback?: LocksEvent | LocksEvent[] | UseLocksCallback,
  callbackOrOptions?: UseLocksCallback | UseSpaceOptions,
  optionsOrNothing?: UseSpaceOptions,
): UseSpaceResult {
  const spaceContext = useSpace();
  const { space } = spaceContext;

  const callback =
    isString(eventOrCallback) || isArray(eventOrCallback) ? (callbackOrOptions as UseLocksCallback) : eventOrCallback;

  const options = isFunction(callbackOrOptions) ? optionsOrNothing : callbackOrOptions;

  const callbackRef = useRef<UseLocksCallback | undefined>(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (callbackRef.current && space?.locks && !options?.skip) {
      const listener: UseLocksCallback = (params) => {
        callbackRef.current?.(params);
      };
      if (isString(eventOrCallback)) {
        space?.locks.subscribe(eventOrCallback, listener);
      } else {
        space?.locks.subscribe<any>(listener);
      }

      return () => {
        if (isString(eventOrCallback)) {
          space?.locks.unsubscribe(eventOrCallback, listener);
        } else {
          space?.locks.unsubscribe<any>(listener);
        }
      };
    }
  }, [space?.locks, options?.skip]);

  return spaceContext;
}

export { useLocks };
