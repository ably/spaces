import { createContext } from 'react';

export const NameModalContext = createContext({
  isModalVisible: false,
  setIsModalVisible: (isVisible: boolean) => {},
});
