import { useState } from 'react';
import { useEventListener } from './useEventListener.js';

import type { Types } from 'ably';

type ChannelStateListener = (stateChange: Types.ChannelStateChange) => void;

const failedStateEvents: Types.ChannelState[] = ['suspended', 'failed', 'detached'];
const successStateEvents: Types.ChannelState[] = ['attached'];

/**
 * todo use `ably/react` hooks instead
 */
export const useChannelState = <S extends Types.ChannelState, C extends Types.ChannelStateChange>(
  emitter?: Types.EventEmitter<ChannelStateListener, C, S>,
) => {
  const [channelError, setChannelError] = useState<Types.ErrorInfo | null>(null);

  useEventListener<Types.ChannelState, Types.ChannelStateChange>(
    emitter,
    (stateChange) => {
      if (stateChange.reason) {
        setChannelError(stateChange.reason);
      }
    },
    failedStateEvents,
  );

  useEventListener<Types.ChannelState, Types.ChannelStateChange>(
    emitter,
    () => {
      setChannelError(null);
    },
    successStateEvents,
  );

  return channelError;
};
