import { Space } from '@ably/spaces';

export const releaseMyLocks = async (space: Space) => {
  await Promise.all([...space.locks.getSelf().map((lock) => space.locks.release(lock.id))]);
};

export const buildLockId = (slide: string | undefined, element: string | undefined) =>
  `/slide/${slide}/element/${element}`;
