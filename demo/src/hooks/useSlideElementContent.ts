import { useCallback, useContext } from 'react';
import { SlidesStateContext } from '../components/SlidesStateContext.tsx';

export const useSlideElementContent = (id: string, defaultContent: string) => {
  const { slidesState, setContent } = useContext(SlidesStateContext);
  const updateContent = useCallback(
    (nextContent: string) => {
      setContent(id, nextContent);
    },
    [id],
  );
  return [slidesState[id] ?? defaultContent, updateContent] as const;
};
