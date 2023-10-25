import React from 'react';
import type Spaces from '../../';

export const SpacesContext = React.createContext<Spaces | undefined>(undefined);

interface SpacesProviderProps {
  client: Spaces;
  children?: React.ReactNode | React.ReactNode[] | null;
}
export const SpacesProvider: React.FC<SpacesProviderProps> = ({ client: spaces, children }) => {
  return <SpacesContext.Provider value={spaces}>{children}</SpacesContext.Provider>;
};
