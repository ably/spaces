import React from 'react';
import type { SpacesClient } from '../../';

export const SpacesContext = React.createContext<SpacesClient | undefined>(undefined);

interface SpacesProviderProps {
  client: SpacesClient;
  children?: React.ReactNode | React.ReactNode[] | null;
}
export const SpacesProvider: React.FC<SpacesProviderProps> = ({ client: spaces, children }) => {
  return <SpacesContext.Provider value={spaces}>{children}</SpacesContext.Provider>;
};
