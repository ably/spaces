import { useContext, useEffect, useRef } from 'react';
import { SpaceContext } from './contexts/SpaceContext.js';
import { useChannelState } from './useChannelState.js';
import { useConnectionState } from './useConnectionState.js';

import type { ErrorInfo } from 'ably';
import type { Space } from '..';
import type { UseSpaceCallback, UseSpaceOptions } from './types.js';

interface UseSpaceResult {
  space?: Space;
  enter?: Space['enter'];
  leave?: Space['leave'];
  updateProfileData?: Space['updateProfileData'];
  connectionError: ErrorInfo | null;
  channelError: ErrorInfo | null;
}

export const useSpace = (callback?: UseSpaceCallback, options?: UseSpaceOptions): UseSpaceResult => {
  const space = useContext(SpaceContext);
  const callbackRef = useRef(callback);

  const channelError = useChannelState(space?.channel);
  const connectionError = useConnectionState();

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (callbackRef.current && space && !options?.skip) {
      const listener: UseSpaceCallback = (params) => {
        callbackRef.current?.(params);
      };
      space.subscribe('update', listener);
      return () => space.unsubscribe('update', listener);
    }
  }, [space, options?.skip]);

  return {
    space,
    enter: space?.enter.bind(space),
    leave: space?.leave.bind(space),
    updateProfileData: space?.updateProfileData.bind(space),
    connectionError,
    channelError,
  };
};
