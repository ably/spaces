type SlideTextElementName = 'text' | 'title' | 'title-caption';
type SlideImgElementName = 'img';

const IS_SELECTED = true;

type Position = [x: number, y: number];

type SlideTextElement = {
  elementType: SlideTextElementName,
  text: string,
  position: Position,
  commentThreadId?: string,
  lockedBy?: string,
};

type SlideImgElement = {
  elementType: SlideImgElementName,
  src: string,
  position: Position,
  alt?: string,
  caption?: string,
  commentThreadId?: string,
  lockedBy?: string,
}

type SlideElement = SlideTextElement | SlideImgElement;

const slideTextElement = (elementType: SlideTextElementName) => (
  text: string,
  position: Position,
  lockedBy?: string,
): SlideTextElement => ({
  elementType,
  text,
  position,
  lockedBy,
});

const slideImgElement = (
  src: string,
  position: Position,
  alt?: string,
  caption?: string,
  lockedBy?: string
): SlideImgElement => ({
  elementType: 'img',
  src,
  position,
  alt,
  caption,
  lockedBy,
});

type SlideData = {
  id: string,
  elements: SlideElement[],
  selected: boolean,
}

const slideData = (id: string, elements = [], selected = !IS_SELECTED): SlideData => ({
  id,
  elements,
  selected,
});


const defaultSelectedSlide = slideData(
  '2',
  [
    slideTextElement('title-caption')('HOW USERS READ', [64,170]),
    slideTextElement('title')('Add Graphics', [64,197]),
    slideTextElement('text')(
      'No one likes boring text blocks on a website. And images and icons are the fastest way to get information.',
      [64,288]
    ),
    slideTextElement('text')(
      `But don't overdo it. If you can't explain for what purpose you put this line or icon, it's better to abandon it.`,
      [64,416]
    ),
    slideImgElement(
      'svg/collaborative-document.svg',
      [543,166]
    )
  ],
  IS_SELECTED
);

export const defaultSlides = [
  defaultSelectedSlide,
];
