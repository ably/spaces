import { useEffect, useRef } from 'react';
import { isFunction } from '../utilities/is.js';
import { useSpace, type UseSpaceResult } from './useSpace.js';

import type { EventKey } from '../utilities/EventEmitter.js';
import type { LockEventMap } from '../Locks.js';
import type { Lock } from '../types.js';

type LocksEvent = EventKey<LockEventMap>;

type UseLocksCallback = (params: Lock) => void;

export interface UseLocksOptions {
  /**
   * If specified, callback will be invoked only for this events
   */
  events?: LocksEvent | LocksEvent[];
  /**
   * Skip parameter makes the hook skip execution -
   * this is useful in order to conditionally register a subscription to
   * an EventListener (needed because it's not possible to conditionally call a hook in react)
   */
  skip?: boolean;
}

/*
 * Registers a subscription on the `Space.locks` object
 */
function useLocks(options?: UseLocksOptions): UseSpaceResult;
function useLocks(callback: UseLocksCallback, options?: UseLocksOptions): UseSpaceResult;
function useLocks(
  callbackOrOptions?: UseLocksCallback | UseLocksOptions,
  optionsOrNothing?: UseLocksOptions,
): UseSpaceResult {
  const spaceContext = useSpace();
  const { space } = spaceContext;

  const callback = isFunction(callbackOrOptions) ? callbackOrOptions : undefined;

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
      if (options?.events) {
        space?.locks.subscribe(options.events, listener);
      } else {
        space?.locks.subscribe<any>(listener);
      }

      return () => {
        if (options?.events) {
          space?.locks.unsubscribe(options.events, listener);
        } else {
          space?.locks.unsubscribe<any>(listener);
        }
      };
    }
  }, [space?.locks, options?.skip, options?.events]);

  return spaceContext;
}

export { useLocks };
