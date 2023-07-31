import { useContext, useEffect, useRef } from 'react';
import { SpacesContext } from '.';

export const Cursors = () => {
  const space = useContext(SpacesContext);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !space) return;

    const { current: cursorContainer } = containerRef;

    const cursorHandlers = {
      enter: (event: MouseEvent) => {
        const { top, left } = cursorContainer.getBoundingClientRect();
        space.cursors.set({ position: { x: event.clientX - left, y: event.clientY - top }, data: { state: 'enter' } });
      },
      move: (event: MouseEvent) => {
        const { top, left } = cursorContainer.getBoundingClientRect();
        space.cursors.set({ position: { x: event.clientX - left, y: event.clientY - top }, data: { state: 'move' } });
      },
      leave: (event: MouseEvent) => {
        const { top, left } = cursorContainer.getBoundingClientRect();
        space.cursors.set({ position: { x: event.clientX - left, y: event.clientY - top }, data: { state: 'leave' } });
      },
    };

    cursorContainer.addEventListener('mouseenter', cursorHandlers.enter);
    cursorContainer.addEventListener('mousemove', cursorHandlers.move);
    cursorContainer.addEventListener('mouseleave', cursorHandlers.leave);

    return () => {
      space.cursors.unsubscribe();
      cursorContainer.removeEventListener('mouseenter', cursorHandlers.enter);
      cursorContainer.removeEventListener('mousemove', cursorHandlers.move);
      cursorContainer.removeEventListener('mouseleave', cursorHandlers.leave);
    };
  }, [space, containerRef]);

  useEffect(() => {
    // 1. Subscribe to space.locations.subscribe('locationUpdate')
    // 2. get a fancy cursor and render it on this component
    if (!space) return;
    space.cursors.subscribe('cursorsUpdate', (cursorUpdate) => {
      console.log(cursorUpdate);
    });

    return () => {
      space.cursors.unsubscribe('cursorsUpdate');
    };
  }, [space]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full z-10 pointer-events-none top-0 left-0 absolute"
    >
      {/* 3. Render the fancy cursor here */}
    </div>
  );
};
