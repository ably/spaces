import { useCallback, useContext } from 'react';
import { SlidesStateContext } from '../components/SlidesStateContext.tsx';

export const useSlideElementContent = (id: string, defaultContent: string) => {
  const { slidesState, setContent } = useContext(SlidesStateContext);
  const setNextContent = useCallback(
    (nextContent: string) => {
      setContent(id, nextContent);
    },
    [id],
  );
  return [slidesState[id] ?? defaultContent, setNextContent] as const;
};
