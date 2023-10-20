import { createContext } from 'react';

export const NameModalContext = createContext({
  isModalVisible: false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setIsModalVisible: (isVisible: boolean) => {}, // eslint-disable-line no-unused-vars
});
