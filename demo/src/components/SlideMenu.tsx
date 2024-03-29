import { SlidePreview } from './SlidePreview';

interface Props {
  slides: {
    children: React.ReactNode;
  }[];
}

export const SlideMenu = ({ slides }: Props) => {
  return (
    <menu className="w-[300px] h-0 hidden md:block">
      <ol
        id="slide-left-preview-list"
        className="relative top-[68px] -left-[26px] flex flex-col scale-[0.2] w-[20%] h-[20%] max-h-[80vh]"
      >
        {slides.map(({ children }, index) => (
          <SlidePreview
            key={`slide-preview-${index}`}
            index={index}
          >
            {children}
          </SlidePreview>
        ))}
      </ol>
    </menu>
  );
};
