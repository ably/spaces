import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { SpaceContext } from './contexts/SpaceContext.js';
import { useMembers } from './useMembers.js';
import { useChannelState } from './useChannelState.js';
import { useConnectionState } from './useConnectionState.js';

import type { CursorUpdate, SpaceMember } from '../types.js';
import type { ErrorInfo } from 'ably';
import type Cursors from '../Cursors.js';
import type { UseSpaceOptions } from './types.js';

interface UseCursorsOptions extends UseSpaceOptions {
  /**
   * Whether to return the cursors object described in UseCursorsResult, defaults to false
   */
  returnCursors?: boolean;
}

interface UseCursorsResult {
  connectionError: ErrorInfo | null;
  channelError: ErrorInfo | null;
  set?: Cursors['set'];
  /**
   * if UseCursorsOptions.returnCursors is truthy; a map from connectionId to associated space member and their cursor update
   */
  cursors: Record<string, { member: SpaceMember; cursorUpdate: CursorUpdate }>;
}

type UseCursorsCallback = (params: CursorUpdate) => void;

/**
 * Registers a subscription on the `Space.cursors` object
 */
export function useCursors(callback?: UseCursorsCallback, options?: UseCursorsOptions): UseCursorsResult {
  const space = useContext(SpaceContext);
  const [cursors, setCursors] = useState<Record<string, { member: SpaceMember; cursorUpdate: CursorUpdate }>>({});
  const { members } = useMembers();
  const channelError = useChannelState(space?.cursors.channel);
  const connectionError = useConnectionState(space?.client.connection);

  const connectionIdToMember: Record<string, SpaceMember> = useMemo(() => {
    return members.reduce((acc, member) => {
      acc[member.connectionId] = member;
      return acc;
    }, {} as Record<string, SpaceMember>);
  }, [members]);

  const callbackRef = useRef<UseCursorsCallback | undefined>(callback);
  const optionsRef = useRef<UseCursorsOptions | undefined>(options);

  useEffect(() => {
    callbackRef.current = callback;
    optionsRef.current = options;
  }, [callback, options]);

  useEffect(() => {
    if (!space || !connectionIdToMember) return;

    const listener: UseCursorsCallback = (cursorUpdate) => {
      if (!optionsRef.current?.skip) callbackRef.current?.(cursorUpdate);

      const { connectionId } = cursorUpdate;

      if (connectionId === space?.connectionId || !optionsRef.current?.returnCursors) return;

      setCursors((currentCursors) => ({
        ...currentCursors,
        [connectionId]: { member: connectionIdToMember[connectionId], cursorUpdate },
      }));
    };

    space.cursors.subscribe('update', listener);

    return () => {
      space.cursors.unsubscribe('update', listener);
    };
  }, [space, connectionIdToMember]);

  return {
    connectionError,
    channelError,
    set: space?.cursors.set.bind(space?.cursors),
    cursors,
  };
}
