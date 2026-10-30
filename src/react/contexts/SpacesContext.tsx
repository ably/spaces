import React from 'react';
import type { SpacesClient } from '../../';

export const SpacesContext = React.createContext<SpacesClient | undefined>(undefined);

interface SpacesClientProviderProps {
  client: SpacesClient;
  children?: React.ReactNode | React.ReactNode[] | null;
}
export const SpacesClientProvider: React.FC<SpacesClientProviderProps> = ({ client: spaces, children }) => {
  return <SpacesContext.Provider value={spaces}>{children}</SpacesContext.Provider>;
};
