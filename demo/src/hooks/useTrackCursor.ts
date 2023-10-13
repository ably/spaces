import { RefObject, useEffect } from 'react';
import { useCursors, useSpace } from '@ably/spaces/react';

export const CURSOR_MOVE = 'move';
export const CURSOR_ENTER = 'enter';
export const CURSOR_LEAVE = 'leave';

export const useTrackCursor = (containerRef: RefObject<HTMLDivElement>, selfConnectionId?: string) => {
  const { set } = useCursors();

  useEffect(() => {
    if (!containerRef.current || !set) return;

    const { current: cursorContainer } = containerRef;

    const cursorHandlers = {
      enter: (event: MouseEvent) => {
        if (!selfConnectionId) return;
        const { top, left } = cursorContainer.getBoundingClientRect();
        set({
          position: { x: event.clientX - left, y: event.clientY - top },
          data: { state: CURSOR_ENTER },
        });
      },
      move: (event: MouseEvent) => {
        if (!selfConnectionId) return;
        const { top, left } = cursorContainer.getBoundingClientRect();
        set({
          position: { x: event.clientX - left, y: event.clientY - top },
          data: { state: CURSOR_MOVE },
        });
      },
      leave: (event: MouseEvent) => {
        if (!selfConnectionId) return;
        const { top, left } = cursorContainer.getBoundingClientRect();
        set({
          position: { x: event.clientX - left, y: event.clientY - top },
          data: { state: CURSOR_LEAVE },
        });
      },
    };

    cursorContainer.addEventListener('mouseenter', cursorHandlers.enter);
    cursorContainer.addEventListener('mousemove', cursorHandlers.move);
    cursorContainer.addEventListener('mouseleave', cursorHandlers.leave);

    return () => {
      cursorContainer.removeEventListener('mouseenter', cursorHandlers.enter);
      cursorContainer.removeEventListener('mousemove', cursorHandlers.move);
      cursorContainer.removeEventListener('mouseleave', cursorHandlers.leave);
    };
  }, [set, containerRef, selfConnectionId]);
};
