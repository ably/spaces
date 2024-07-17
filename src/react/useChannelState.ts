import { useState } from 'react';
import { useEventListener } from './useEventListener.js';

import type { ChannelState, ChannelStateChange, ErrorInfo, EventEmitter } from 'ably';

type ChannelStateListener = (stateChange: ChannelStateChange) => void;

const failedStateEvents: ChannelState[] = ['suspended', 'failed', 'detached'];
const successStateEvents: ChannelState[] = ['attached'];

/**
 * todo use `ably/react` hooks instead
 */
export const useChannelState = <S extends ChannelState, C extends ChannelStateChange>(
  emitter?: EventEmitter<ChannelStateListener, C, S>,
) => {
  const [channelError, setChannelError] = useState<ErrorInfo | null>(null);

  useEventListener<ChannelState, ChannelStateChange>(
    emitter,
    (stateChange) => {
      if (stateChange.reason) {
        setChannelError(stateChange.reason);
      }
    },
    failedStateEvents,
  );

  useEventListener<ChannelState, ChannelStateChange>(
    emitter,
    () => {
      setChannelError(null);
    },
    successStateEvents,
  );

  return channelError;
};
