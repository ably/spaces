import React from 'react';
import { AblyProvider } from 'ably/react';
import type Spaces from '../../';

export const SpacesContext = React.createContext<Spaces | undefined>(undefined);

interface SpacesProviderProps {
  client: Spaces;
  children?: React.ReactNode | React.ReactNode[] | null;
}
export const SpacesProvider: React.FC<SpacesProviderProps> = ({ client: spaces, children }) => {
  return (
    <SpacesContext.Provider value={spaces}>
      <AblyProvider client={spaces.client}>{children}</AblyProvider>
    </SpacesContext.Provider>
  );
};
