import { useEffect, useRef, useState } from 'react';
import { useSpace } from './useSpace.js';
import { isArray, isFunction, isString } from '../utilities/is.js';

import type { ErrorInfo } from 'ably';
import type { Space, SpaceMember } from '..';
import type { UseSpaceOptions } from './types.js';

interface UseMembersResult {
  space?: Space;
  /**
   * All members present in the space
   */
  members: SpaceMember[];
  /**
   * All members present in the space excluding the member associated with the spaces client
   */
  others: SpaceMember[];
  /**
   * The member associated with the spaces client
   */
  self: SpaceMember | null;
  channelError: ErrorInfo | null;
  connectionError: ErrorInfo | null;
}

type UseMembersCallback = (params: SpaceMember) => void;

type MembersEvent = 'leave' | 'enter' | 'update' | 'updateProfile' | 'remove';

function useMembers(callback?: UseMembersCallback, options?: UseSpaceOptions): UseMembersResult;
function useMembers(
  event: MembersEvent | MembersEvent[],
  callback: UseMembersCallback,
  options?: UseSpaceOptions,
): UseMembersResult;

function useMembers(
  eventOrCallback?: MembersEvent | MembersEvent[] | UseMembersCallback,
  callbackOrOptions?: UseMembersCallback | UseSpaceOptions,
  optionsOrNothing?: UseSpaceOptions,
): UseMembersResult {
  const { space, connectionError, channelError } = useSpace();
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [others, setOthers] = useState<SpaceMember[]>([]);
  const [self, setSelf] = useState<SpaceMember | null>(null);

  const callback =
    isString(eventOrCallback) || isArray(eventOrCallback) ? (callbackOrOptions as UseMembersCallback) : eventOrCallback;

  const options = isFunction(callbackOrOptions) ? optionsOrNothing : callbackOrOptions;

  const callbackRef = useRef<UseMembersCallback | undefined>(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (callbackRef.current && members && !options?.skip) {
      const listener: UseMembersCallback = (params) => {
        callbackRef.current?.(params);
      };
      if (isString(eventOrCallback)) {
        space?.members.subscribe(eventOrCallback, listener);
      } else {
        space?.members.subscribe<MembersEvent>(listener);
      }

      return () => {
        if (isString(eventOrCallback)) {
          space?.members.unsubscribe(eventOrCallback, listener);
        } else {
          space?.members.unsubscribe<MembersEvent>(listener);
        }
      };
    }
  }, [space?.members, options?.skip]);

  useEffect(() => {
    if (!space) return;
    let ignore: boolean = false;

    const updateState = (updatedSelf: SpaceMember | null, updatedMembers: SpaceMember[]) => {
      if (ignore) return;
      setSelf(updatedSelf);
      setMembers([...updatedMembers]);
      setOthers(updatedMembers.filter((member) => member.connectionId !== updatedSelf?.connectionId));
    };

    const handler = async ({ members: updatedMembers }: { members: SpaceMember[] }) => {
      const updatedSelf = await space.members.getSelf();
      updateState(updatedSelf, updatedMembers);
    };

    const init = async () => {
      const initSelf = await space.members.getSelf();
      const initMembers = await space.members.getAll();
      updateState(initSelf, initMembers);
      space.subscribe('update', handler);
    };

    init();

    return () => {
      ignore = true;
      space.unsubscribe('update', handler);
    };
  }, [space]);

  return {
    space,
    members,
    others,
    self,
    connectionError,
    channelError,
  };
}

export { useMembers };
