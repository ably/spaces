import { useEffect, useRef, useState } from 'react';
import { useSpace } from './useSpace.js';
import { isFunction } from '../utilities/is.js';

import type { ErrorInfo } from 'ably';
import type { Space, SpaceMember } from '..';
import type { EventKey } from '../utilities/EventEmitter.js';
import type { MemberEventsMap } from '../Members.js';

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

type MembersEvent = EventKey<MemberEventsMap>;

export interface UseMembersOptions {
  /**
   * If specified, callback will be invoked only for this events
   */
  events?: MembersEvent | MembersEvent[];
  /**
   * Skip parameter makes the hook skip execution -
   * this is useful in order to conditionally register a subscription to
   * an EventListener (needed because it's not possible to conditionally call a hook in react)
   */
  skip?: boolean;
}

function useMembers(options?: UseMembersOptions): UseMembersResult;
function useMembers(callback: UseMembersCallback, options?: UseMembersOptions): UseMembersResult;

function useMembers(
  callbackOrOptions?: UseMembersCallback | UseMembersOptions,
  optionsOrNothing?: UseMembersOptions,
): UseMembersResult {
  const { space, connectionError, channelError } = useSpace();
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [others, setOthers] = useState<SpaceMember[]>([]);
  const [self, setSelf] = useState<SpaceMember | null>(null);

  const callback = isFunction(callbackOrOptions) ? callbackOrOptions : undefined;

  const options = isFunction(callbackOrOptions) ? optionsOrNothing : callbackOrOptions;

  const callbackRef = useRef<UseMembersCallback | undefined>(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (callbackRef.current && space?.members && !options?.skip) {
      const listener: UseMembersCallback = (params) => {
        callbackRef.current?.(params);
      };
      if (options?.events) {
        space?.members.subscribe(options?.events, listener);
      } else {
        space?.members.subscribe<any>(listener);
      }

      return () => {
        if (options?.events) {
          space?.members.unsubscribe(options.events, listener);
        } else {
          space?.members.unsubscribe<any>(listener);
        }
      };
    }
  }, [space?.members, options?.skip, options?.events]);

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
