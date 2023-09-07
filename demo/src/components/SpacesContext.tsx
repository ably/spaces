import * as React from 'react';
import { AblyProvider } from '@ably-labs/react-hooks';

import Spaces, { type Space } from '@ably/spaces';
import { Realtime } from 'ably';
import { nanoid } from 'nanoid';

import { getSpaceNameFromUrl } from '../utils';

export const SpacesContext = React.createContext<Space | undefined>(undefined);

const SpaceContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [space, setSpace] = React.useState<Space | undefined>(undefined);
  const spaceName = getSpaceNameFromUrl();

  const [spaces, ably] = React.useMemo(() => {
    const clientId = nanoid();

    const ably = new Realtime.Promise({
      authUrl: `/api/ably-token-request?clientId=${clientId}`,
      clientId,
    });

    return [new Spaces(ably), ably];
  }, []);

  React.useEffect(() => {
    let ignore = false;

    const init = async () => {
      const spaceInstance = await spaces.get(getSpaceNameFromUrl(), {
        offlineTimeout: 10_000,
      });

      if (spaceInstance && !space && !ignore) {
        setSpace(spaceInstance);
      }
    };

    init();

    return () => {
      ignore = true;
    };
  }, [spaceName, spaces]);

  return (
    <AblyProvider client={ably}>
      <SpacesContext.Provider value={space}>{children}</SpacesContext.Provider>{' '}
    </AblyProvider>
  );
};

export { SpaceContextProvider };
