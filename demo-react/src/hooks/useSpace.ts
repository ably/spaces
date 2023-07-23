import { useEffect, useState } from 'react';

import { getSpaceNameFromUrl } from '../utils/url';
import { spaces } from '../utils/spaces';
import { getRandomName } from '../utils/fake-names';
import { Space } from '@ably-labs/spaces';

export const useSpace = () => {
  const [space, setSpace] = useState<Space | null>(null);

  useEffect(() => {
    const initSpace = async () => {
      const space = await spaces.get(getSpaceNameFromUrl(), {
        offlineTimeout: 10_000,
      });

      const name = getRandomName();
      await space.enter({ name });
      setSpace(space);
    };
    initSpace();
  }, []);

  return space;
};
