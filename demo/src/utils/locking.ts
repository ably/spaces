import { Space } from '@ably-labs/spaces';
import { Member } from './types';

export const releaseMyLocks = async (space: Space, self: Member) => {
  for (const selfLock of self.locks.keys()) {
    await space.locks.release(selfLock);
  }
};

export const buildLockId = (slide: string | undefined, element: string | undefined) =>
  `/slide/${slide}/element/${element}`;
