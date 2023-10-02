import { useEffect, useRef } from 'react';

import type { Types } from 'ably';

type EventListener<T> = (stateChange: T) => void;

export const useEventListener = <
  S extends Types.ConnectionState | Types.ChannelState,
  C extends Types.ConnectionStateChange | Types.ChannelStateChange,
>(
  emitter?: Types.EventEmitter<EventListener<C>, C, S>,
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
