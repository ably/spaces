import { useState } from 'react';
import { useConnectionStateListener } from 'ably/react';

import type { Types } from 'ably';

const failedStateEvents: Types.ConnectionState[] = ['suspended', 'failed', 'disconnected'];
const successStateEvents: Types.ConnectionState[] = ['connected', 'closed'];

export const useConnectionState = () => {
  const [connectionError, setConnectionError] = useState<Types.ErrorInfo | null>(null);

  useConnectionStateListener(failedStateEvents, (stateChange) => {
    if (stateChange.reason) {
      setConnectionError(stateChange.reason);
    }
  });

  useConnectionStateListener(successStateEvents, () => {
    setConnectionError(null);
  });

  return connectionError;
};
