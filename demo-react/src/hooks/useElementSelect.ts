import { useContext } from 'react';
import { SpacesContext } from '../components';
import { useMembers } from './useMembers';

export const useElementSelect = (element?: string) => {
  const space = useContext(SpacesContext);
  const { self } = useMembers();

  const handleSelect = () => {
    if (!space || !self) return;
    space.locations.set({ slide: self.location?.slide, element });
  };

  return { handleSelect };
};
