import { useEffect, useRef } from 'react';

import type { ChannelState, ChannelStateChange, ConnectionState, ConnectionStateChange, EventEmitter } from 'ably';

type EventListener<T> = (stateChange: T) => void;

/**
 * todo use `ably/react` hooks instead
 */
export const useEventListener = <
  S extends ConnectionState | ChannelState,
  C extends ConnectionStateChange | ChannelStateChange,
>(
  emitter?: EventEmitter<EventListener<C>, C, S>,
  listener?: EventListener<C>,
  event?: S | S[],
) => {
  const listenerRef = useRef(listener);

  useEffect(() => {
    listenerRef.current = listener;
  }, [listener]);

  useEffect(() => {
    const callback: EventListener<C> = (stateChange) => {
      listenerRef.current?.(stateChange);
    };

    if (event) {
      emitter?.on(event as S, callback);
    } else {
      emitter?.on(callback);
    }

    return () => {
      if (event) {
        emitter?.off(event as S, callback);
      } else {
        emitter?.off(callback);
      }
    };
  }, [emitter, event]);
};
