import { useContext, useEffect, useState } from 'react';
import { SpaceContext } from './contexts/SpaceContext.js';

import type { LockStatus, SpaceMember, Lock } from '../types.js';

interface UseLockResult {
  status: LockStatus | null;
  member: SpaceMember | null;
}

/*
 * Returns the status of a lock and, if it has been acquired, the member holding the lock
 */
export function useLock(lockId: string): UseLockResult {
  const space = useContext(SpaceContext);
  const [status, setStatus] = useState<LockStatus | null>(null);
  const [member, setMember] = useState<SpaceMember | null>(null);

  const initialized = status !== null;

  useEffect(() => {
    if (!space) return;

    const handler = (lock: Lock) => {
      if (lock.id !== lockId) return;

      if (lock.status === 'unlocked') {
        setStatus(null);
        setMember(null);
      } else {
        setStatus(lock.status);
        setMember(lock.member);
      }
    };

    space.locks.subscribe('update', handler);

    return () => {
      space?.locks.unsubscribe('update', handler);
    };
  }, [space, lockId]);

  useEffect(() => {
    if (initialized || !space) return;

    const lock = space?.locks.get(lockId);

    if (lock) {
      setMember(lock.member);
      setStatus(lock.status);
    }
  }, [initialized, space]);

  return { status, member };
}
