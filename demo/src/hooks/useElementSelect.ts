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

      if (!lock) {
        // The lock is not set but we enter the location optimistically
        await space.locations.set({ slide: self.location?.slide, element });
        // TODO delete this workaround when spaces API is ready
        await delay(60);
        await space.locks.acquire(lockId);
      }
    } else {
      space.locations.set({ slide: self.location?.slide, element });
    }
  };

  return { handleSelect };
};

export const useClickOutside = (ref: MutableRefObject<HTMLElement | null>, self?: Member, enabled?: boolean) => {
  const space = useContext(SpacesContext);

  useEffect(() => {
    if (!enabled) return;
    const handleClick = async (e: DocumentEventMap['click']) => {
      const clickedOutside = !ref.current?.contains(e.target as Node);
      if (clickedOutside && space && self) {
        await space.locations.set({ slide: self.location?.slide, element: undefined });
        // TODO delete this workaround when spaces API is ready
        await delay(60);
        await releaseMyLocks(space);
      }
    };

    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [space, self, enabled]);
};

export const useClearOnFailedLock = (lockConflict: boolean, self?: Member) => {
  const space = useContext(SpacesContext);

  useEffect(() => {
    if (lockConflict) {
      space?.locations.set({ slide: self?.location?.slide, element: undefined });
    }
  }, [lockConflict]);
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
