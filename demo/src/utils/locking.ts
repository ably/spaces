import { Space } from '@ably/spaces';
import { Member } from './types';

export const releaseMyLocks = async (space: Space, self: Member) => {
  await Promise.all([
    ...space.locks.getLocksForConnectionId(self.connectionId).map((lock) => space.locks.release(lock.id)),
  ]);
};

export const buildLockId = (slide: string | undefined, element: string | undefined) =>
  `/slide/${slide}/element/${element}`;
