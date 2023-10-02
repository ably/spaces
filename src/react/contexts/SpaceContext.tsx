import * as React from 'react';
import { useSpaces } from '../useSpaces.js';

import type { Space, SpaceOptions } from '../../';

export const SpaceContext = React.createContext<Space | undefined>(undefined);

interface SpaceProviderProps {
  name: string;
  options?: SpaceOptions;
  children?: React.ReactNode | React.ReactNode[] | null;
}
export const SpaceProvider: React.FC<SpaceProviderProps> = ({ name, options, children }) => {
  const [space, setSpace] = React.useState<Space | undefined>(undefined);
  const spaces = useSpaces();
  const optionsRef = React.useRef(options);

  React.useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  React.useEffect(() => {
    let ignore: boolean = false;

    const init = async () => {
      if (!spaces) return;

      const spaceInstance = await spaces.get(name, optionsRef.current);

      if (spaceInstance && !space && !ignore) {
        setSpace(spaceInstance);
      }
    };

    init();

    return () => {
      ignore = true;
    };
  }, [name, spaces]);

  return <SpaceContext.Provider value={space}>{children}</SpaceContext.Provider>;
};
