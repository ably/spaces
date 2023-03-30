type SlideTextElementName = 'text' | 'title' | 'title-caption';
type SlideImgElementName = 'img';

const IS_SELECTED = true;

type Position = [x: number, y: number];

export type SlideTextElement = {
  elementType: SlideTextElementName;
  text: string;
  position: Position;
  width?: number;
  commentThreadId?: string;
  lockedBy?: string;
};

export type SlideImgElement = {
  elementType: SlideImgElementName;
  src: string;
  position: Position;
  alt?: string;
  caption?: string;
  commentThreadId?: string;
  lockedBy?: string;
};

export type SlideElement = SlideTextElement | SlideImgElement;

// TODO: Define and render behaviour for elements that are `lockedBy` a user
// TODO: Define and render behaviour for elements that have a `commentThreadId` started by a particular user
const slideTextElement =
  (elementType: SlideTextElementName) =>
  (text: string, position: Position, width?: number, lockedBy?: string): SlideTextElement => ({
    elementType,
    text,
    position,
    width,
    lockedBy,
  });

const slideImgElement = (
  src: string,
  position: Position,
  alt?: string,
  caption?: string,
  lockedBy?: string,
): SlideImgElement => ({
  elementType: 'img',
  src,
  position,
  alt,
  caption,
  lockedBy,
});

export type SlideData = {
  id: string;
  elements: SlideElement[];
  selected: boolean;
};

const slideData = (id: string, elements = [], selected = !IS_SELECTED): SlideData => ({
  id,
  elements,
  selected,
});

const defaultSelectedSlide = slideData(
  '2',
  [
    slideTextElement('title-caption')('HOW USERS READ', [64, 170]),
    slideTextElement('title')('Add graphics', [64, 197]),
    slideTextElement('text')(
      'No one likes boring text blocks on a website. And <span class="text-ably-avatar-stack-demo-slide-title-highlight font-semibold">images and icons</span> are the fastest way to get information.',
      [64, 288],
      423,
    ),
    slideTextElement('text')(
      `But <span class="text-ably-avatar-stack-demo-slide-title-highlight font-semibold">don't overdo it</span>. If you can't explain for what purpose you put this line or icon, it's better to abandon it.`,
      [64, 416],
      396,
      'Lauren',
    ),
    slideImgElement('assets/svg/collaborative-document.svg', [543, 166]),
    slideTextElement('text')('2022', [952, 626]),
  ],
  IS_SELECTED,
);

// TODO: Define and render users associated with a particular slide
export const defaultSlides = [
  slideData('1', [slideImgElement('assets/svg/placeholder-slide-1.svg', [100, 160])]),
  defaultSelectedSlide,
  slideData('3', [slideImgElement('assets/svg/placeholder-slide-2.svg', [100, 200])]),
  slideData('4', [slideImgElement('assets/svg/placeholder-slide-3.svg', [200, 200])]),
  slideData('5', [slideImgElement('assets/svg/placeholder-slide-2.svg', [100, 200])]),
];
