import React, { useMemo, useState } from 'react';

interface SlidesStateContextProps {
  slidesState: Record<string, string>;
  setContent(id: string, nextContent: string): void;
}
export const SlidesStateContext = React.createContext<SlidesStateContextProps>({
  slidesState: {},
  setContent: () => {},
});

export const SlidesStateContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [slidesState, setSlidesState] = useState<Record<string, string>>({});
  const value = useMemo(
    () => ({
      slidesState,
      setContent: (id: string, nextContent: string) => {
        setSlidesState((prevState) => ({ ...prevState, [id]: nextContent }));
      },
    }),
    [slidesState, setSlidesState],
  );
  return <SlidesStateContext.Provider value={value}>{children}</SlidesStateContext.Provider>;
};
