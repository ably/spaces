import collaborativeDocumentUrl from '../assets/svg/collaborative-document.svg';
import alignment from '../assets/svg/alignment.svg';
import contrast from '../assets/svg/contrast.svg';
import proximity from '../assets/svg/proximity.svg';
import repetition from '../assets/svg/repetition.svg';
import bubbleChart from '../assets/svg/bubble-diagram.svg';
import { nanoid } from 'nanoid';

type SlideTextElementName = 'text' | 'title' | 'subtitle' | 'title-caption' | 'aside-text';
type SlideImgElementName = 'img';

const IS_SELECTED = true;
const IS_NOT_SELECTED = false;

type Position = [x: number, y: number];

type SlideTextElement = {
  id: string;
  elementType: SlideTextElementName;
  text: string;
  position: Position;
  width?: number;
  commentThreadId?: string;
  lockedBy?: string;
};

type SlideImgElement = {
  id: string;
  elementType: SlideImgElementName;
  src: string;
  position: Position;
  alt?: string;
  caption?: string;
  commentThreadId?: string;
  lockedBy?: string;
};

type SlideElement = SlideTextElement | SlideImgElement;

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
  id: id,
  elementType: 'img',
  src,
  position,
  alt,
  caption,
  lockedBy,
});

type SlideData = {
  id: string;
  elements: SlideElement[];
  selected: boolean;
};

const slideData = (id: string, elements = [], selected = !IS_SELECTED): SlideData => ({
  id,
  elements,
  selected,
});

const defaultSlideOne = slideData('0', [
  slideTextElement('title')('0', 'Key Design Principles', [64, 216], 401),
  slideTextElement('text')(
    '1',
    'Effective design centres on four basic principles: contrast, repetition, alignment and proximity. These appear in every design.',
    [64, 351],
    354,
  ),
  slideImgElement('2', contrast, [491, 105]),
  slideImgElement('3', repetition, [738, 105]),
  slideImgElement('4', alignment, [491, 356]),
  slideImgElement('5', proximity, [738, 356]),
  slideTextElement('subtitle')('6', 'Contrast', [511, 193]),
  slideTextElement('subtitle')('7', 'Repetition', [758, 193]),
  slideTextElement('subtitle')('8', 'Alignment', [511, 444]),
  slideTextElement('subtitle')('9', 'Proximity', [758, 444]),
  slideTextElement('aside-text')(
    '10',
    'When a design uses several elements, the goal is to make each one distinct.',
    [510, 225],
    183,
  ),
  slideTextElement('aside-text')(
    '11',
    'Repetition helps designers establish relationships, develop organization and strengthen unity.',
    [757, 225],
    183,
  ),
  slideTextElement('aside-text')(
    '12',
    'Alignment creates a clean, sophisticated look. All elements should relate to all others in some way.',
    [510, 476],
    183,
  ),
  slideTextElement('aside-text')(
    '13',
    'When items are grouped, they become a single visual unit, rather than several separate entities.',
    [757, 476],
    183,
  ),
]);

const defaultSlideTwo = slideData(
  '1',
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

const defaultSlideThree = slideData('2', [
  slideTextElement('title')('0', 'Design Statistics', [64, 97], 401),
  slideTextElement('text')('1', 'How do SMBs rate the importance of graphic design to their success?', [64, 186], 354),
  slideImgElement(
    '3',
    bubbleChart,
    [289, 180],
    'Bubble chart showing: Very important - 49%, Neutral - 42%, Unimportant - 9 %',
  ),
]);

const defaultSelectedSlide = defaultSlideTwo;

const defaultSlides = [defaultSlideOne, defaultSelectedSlide, defaultSlideThree];

export {
  defaultSlides,
  IS_SELECTED,
  IS_NOT_SELECTED,
  type SlideTextElement,
  type SlideImgElement,
  type SlideElement,
  type SlideData,
};
