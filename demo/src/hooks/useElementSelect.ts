import { useContext } from 'react';
import { SpacesContext } from '../components';
import { useMembers } from './useMembers';

import { buildLockId, releaseMyLocks } from '../utils/locking';

export const useElementSelect = (element?: string, lockable: boolean = true) => {
  const space = useContext(SpacesContext);
  const { self } = useMembers();

  const handleSelect = async () => {
    if (!space || !self) return;

    if (lockable) {
      const lockId = buildLockId(self.location?.slide, element);
      const lock = space.locks.get(lockId);

      if (lock?.request.status !== 'locked') {
        releaseMyLocks(space, self);
        space.locks.acquire(lockId);

        // The lock is pending but we enter the location optimistically
        space.locations.set({ slide: self.location?.slide, element });
      }
    } else {
      releaseMyLocks(space, self);
      space.locations.set({ slide: self.location?.slide, element });
    }
  };

  return { handleSelect };
};
