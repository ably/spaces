import React, { useContext } from 'react';

interface PreviewContextProviderProps {
  preview: boolean;
  children: React.ReactNode;
}
const PreviewContext = React.createContext<boolean>(false);

export const PreviewProvider: React.FC<PreviewContextProviderProps> = ({ preview, children }) => (
  <PreviewContext.Provider value={preview}>{children}</PreviewContext.Provider>
);

export const usePreview = () => useContext<boolean>(PreviewContext);
