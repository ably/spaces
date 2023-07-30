import { useMembers } from '../hooks';
import { SlidePreviewProps } from './SlidePreview';

interface Props {
  slides: Omit<SlidePreviewProps, 'index'>[];
}

export const CurrentSlide = ({ slides }: Props) => {
  const { self } = useMembers();
  const slide = self?.location?.slide || 0;
  return (
    <div
      data-id="slide-wrapper"
      className="flex flex-col justify-between px-8 py-8 md:h-full md:w-full bg-white"
    >
      {slides[slide].children}
    </div>
  );
};
