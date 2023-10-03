import { useContext } from 'react';
import { SpacesContext } from './contexts/SpacesContext.js';

export const useSpaces = () => {
  return useContext(SpacesContext);
};
