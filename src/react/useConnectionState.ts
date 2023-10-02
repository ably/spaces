import { useState } from 'react';
import { useEventListener } from './useEventListener.js';

import type { Types } from 'ably';

type ConnectionStateListener = (stateChange: Types.ConnectionStateChange) => void;

const failedStateEvents: Types.ConnectionState[] = ['suspended', 'failed', 'disconnected'];
const successStateEvents: Types.ConnectionState[] = ['connected', 'closed'];

export const useConnectionState = <S extends Types.ConnectionState, C extends Types.ConnectionStateChange>(
  emitter?: Types.EventEmitter<ConnectionStateListener, C, S>,
) => {
  const [connectionError, setConnectionError] = useState<Types.ErrorInfo | null>(null);

  useEventListener<Types.ConnectionState, Types.ConnectionStateChange>(
    emitter,
    (stateChange) => {
      if (stateChange.reason) {
        setConnectionError(stateChange.reason);
      }
    },
    failedStateEvents,
  );

  useEventListener<Types.ConnectionState, Types.ConnectionStateChange>(
    emitter,
    () => {
      setConnectionError(null);
    },
    successStateEvents,
  );

  return connectionError;
};
