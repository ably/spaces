import { useContext, useEffect, useState } from 'react';

import { type Lock, LockStatus } from '@ably-labs/spaces';

import { SpacesContext } from '../components';
import { buildLockId } from '../utils/locking';
import { isMember, useMembers } from '../hooks';

import { type Member } from '../utils/types';

export const useLock = (slide: string, id: string): { status?: string; member?: Member } => {
  const space = useContext(SpacesContext);
  const locationLockId = buildLockId(slide, id);
  const [status, setStatus] = useState<LockStatus | undefined>(undefined);
  const [member, setMember] = useState<Member | undefined>(undefined);
  const { others } = useMembers();

  useEffect(() => {
    if (!space) return;

    const handler = (lock: Lock) => {
      if (lock.request.id !== locationLockId) return;

      setStatus(lock.request.status);

      if (isMember(lock.member)) {
        setMember(lock.member);
      }
    };

    space.locks.subscribe('update', handler);

    return () => {
      space?.locks.unsubscribe('update', handler);
    };
  }, [space, slide, id]);

  useEffect(() => {
    if (status !== undefined) return;
    for (const member of others ?? []) {
      const lock = member.locks.get(locationLockId);
      if (lock) {
        setMember(member);
        setStatus(lock.status);
      }
    }
  }, [others, status]);

  return { status, member };
};

export const useLockStatus = (slide: string, id: string, selfConnectionId?: string) => {
  const { member, status } = useLock(slide, id);

  const locked = status === 'locked';
  const lockedByYou = locked && member?.connectionId === selfConnectionId;

  return { locked, lockedByYou };
};
