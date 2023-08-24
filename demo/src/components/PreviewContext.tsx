import React, { useContext } from 'react';

interface PreviewContextProviderProps {
  miniature: boolean;
  children: React.ReactNode;
}
const PreviewContext = React.createContext<boolean>(false);

export const PreviewContextProvider: React.FC<PreviewContextProviderProps> = ({ miniature, children }) => (
  <PreviewContext.Provider value={miniature}>{children}</PreviewContext.Provider>
);

export const usePreview = () => useContext<boolean>(PreviewContext);
