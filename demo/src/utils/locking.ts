export const releaseMyLocks = async (space, self) => {
  for (const selfLock of self.locks.keys()) {
    await space.locks.release(selfLock);
  }
};

export const buildLockId = (slide, element) => `/slide/${slide}/element/${element}`;
