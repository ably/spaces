import { useRef } from 'react';
import { Cursors } from '.';
import { useMembers, useTrackCursor } from '../hooks';
import { SlidePreviewProps } from './SlidePreview';

interface Props {
  slides: Omit<SlidePreviewProps, 'index'>[];
}

export const CurrentSlide = ({ slides }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { self } = useMembers();
  const slide = self?.location?.slide || 0;

  useTrackCursor(containerRef);

  return (
    <section
      ref={containerRef}
      className="shadow-ably-paper xs:m-4 md:m-0 md:relative md:w-[1020px] md:h-[687px] md:min-w-[1020px] md:min-h-[687px] md:top-[79px] lg:mr-[380px]"
    >
      <div className="flex flex-col justify-between px-8 py-8 md:h-full md:w-full bg-white">
        {slides[slide].children}
      </div>
      <Cursors />
    </section>
  );
};
