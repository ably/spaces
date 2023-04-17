import collaborativeDocumentUrl from '../assets/svg/collaborative-document.svg';
import placeholderSlide1 from '../assets/svg/placeholder-slide-1.svg';
import placeholderSlide2 from '../assets/svg/placeholder-slide-2.svg';
import placeholderSlide3 from '../assets/svg/placeholder-slide-3.svg';
import { nanoid } from 'nanoid';

type SlideTextElementName = 'text' | 'title' | 'title-caption';
type SlideImgElementName = 'img';

const IS_SELECTED = true;

type Position = [x: number, y: number];

export type SlideTextElement = {
  id: string;
  elementType: SlideTextElementName;
  text: string;
  position: Position;
  width?: number;
  commentThreadId?: string;
  lockedBy?: string;
};

export type SlideImgElement = {
  id: string;
  elementType: SlideImgElementName;
  src: string;
  position: Position;
  alt?: string;
  caption?: string;
  commentThreadId?: string;
  lockedBy?: string;
};

export type SlideElement = SlideTextElement | SlideImgElement;

const slideTextElement =
  (elementType: SlideTextElementName) =>
  (id: string, text: string, position: Position, width?: number, lockedBy?: string): SlideTextElement => ({
    id,
    elementType,
    text,
    position,
    width,
    lockedBy,
  });

const slideImgElement = (
  id: string,
  src: string,
  position: Position,
  alt?: string,
  caption?: string,
  lockedBy?: string,
): SlideImgElement => ({
  id: nanoid(),
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
    slideTextElement('title-caption')('0', 'HOW USERS READ', [64, 170]),
    slideTextElement('title')('1', `Add graphics`, [56, 197]),
    slideTextElement('text')(
      '2',
      'No one likes boring text blocks on a website. And <span class="text-ably-avatar-stack-demo-slide-title-highlight font-semibold">images and icons</span> are the fastest way to get information.',
      [44, 288],
      423,
    ),
    slideTextElement('text')(
      '3',
      `But <span class="text-ably-avatar-stack-demo-slide-title-highlight font-semibold">don't overdo it</span>. If you can't explain for what purpose you put this line or icon, it's better to abandon it.`,
      [44, 416],
      396,
      'Lauren',
    ),
    slideImgElement('4', collaborativeDocumentUrl, [543, 166]),
    slideTextElement('text')('5', '2022', [952, 626]),
  ],
  IS_SELECTED,
);

export const defaultSlides = [
  slideData('1', [slideImgElement('0', placeholderSlide1, [100, 160])]),
  defaultSelectedSlide,
  slideData('3', [slideImgElement('0', placeholderSlide2, [100, 200])]),
  slideData('4', [slideImgElement('0', placeholderSlide3, [200, 200])]),
  slideData('5', [slideImgElement('0', placeholderSlide2, [100, 200])]),
];
