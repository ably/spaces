import { MutableRefObject, useContext, useEffect } from 'react';
import { SpacesContext } from '../components';
import { useMembers } from './useMembers';

import { buildLockId, releaseMyLocks } from '../utils/locking';
import { Member } from '../utils/types';

export const useElementSelect = (element?: string, lockable: boolean = true) => {
  const space = useContext(SpacesContext);
  const { self } = useMembers();

  const handleSelect = async () => {
    if (!space || !self) return;

    if (lockable) {
      const lockId = buildLockId(self.location?.slide, element);
      const lock = space.locks.get(lockId);

      if (lock?.request.status !== 'locked') {
        space.locks.acquire(lockId);

        // The lock is pending but we enter the location optimistically
        space.locations.set({ slide: self.location?.slide, element });
      }
    } else {
      space.locations.set({ slide: self.location?.slide, element });
    }
  };

  return { handleSelect };
};

export const useClickOutside = (ref: MutableRefObject<HTMLElement | null>, self?: Member, locked?: boolean) => {
  const space = useContext(SpacesContext);

  useEffect(() => {
    if (!locked) return;
    const handleClick = (e: DocumentEventMap['click']) => {
      const clickedOutside = !ref.current?.contains(e.target as Node);
      if (clickedOutside && space && self) {
        releaseMyLocks(space, self);
        space.locations.set({ slide: self.location?.slide, element: undefined });
      }
    };

    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [space, self, locked]);
};
