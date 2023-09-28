import { Space } from '@ably/spaces';

export const releaseMyLocks = async (space: Space) => {
  const locks = await space.locks.getSelf();

  if (locks.length > 0) {
    locks.forEach((lock) => space.locks.release(lock.id));
  }
};

export const buildLockId = (slide: string | undefined, element: string | undefined) =>
  `/slide/${slide}/element/${element}`;
