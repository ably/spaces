import React, { useContext } from 'react';

interface MiniatureContextProviderProps {
  miniature: boolean;
  children: React.ReactNode;
}
const MiniatureContext = React.createContext<boolean>(false);

export const MiniatureContextProvider: React.FC<MiniatureContextProviderProps> = ({ miniature, children }) => (
  <MiniatureContext.Provider value={miniature}>{children}</MiniatureContext.Provider>
);

export const useMiniature = () => useContext<boolean>(MiniatureContext);
