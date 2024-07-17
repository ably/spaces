import { useState } from 'react';
import { useEventListener } from './useEventListener.js';

import type { ConnectionState, ConnectionStateChange, ErrorInfo, EventEmitter } from 'ably';

type ConnectionStateListener = (stateChange: ConnectionStateChange) => void;

const failedStateEvents: ConnectionState[] = ['suspended', 'failed', 'disconnected'];
const successStateEvents: ConnectionState[] = ['connected', 'closed'];

export const useConnectionState = <S extends ConnectionState, C extends ConnectionStateChange>(
  emitter?: EventEmitter<ConnectionStateListener, C, S>,
) => {
  const [connectionError, setConnectionError] = useState<ErrorInfo | null>(null);

  useEventListener<ConnectionState, ConnectionStateChange>(
    emitter,
    (stateChange) => {
      if (stateChange.reason) {
        setConnectionError(stateChange.reason);
      }
    },
    failedStateEvents,
  );

  useEventListener<ConnectionState, ConnectionStateChange>(
    emitter,
    () => {
      setConnectionError(null);
    },
    successStateEvents,
  );

  return connectionError;
};
