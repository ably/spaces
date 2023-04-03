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
    slideTextElement('title')(
      `<div class="border-2 border-dashed border-[#FF007A] p-2 relative">
				<div class="absolute w-11 h-11 rounded-full shadow-xl -right-11 -top-11 before:h-4 before:w-4 before:ml-1 before:mb-1 before:-rotate-12 before:content-[' '] before:inline-block before:bg-white before:rounded-1">
					<div class="absolute w-10 h-10 top-0.5 left-0.5 rounded-full bg-purple-500 flex justify-center items-center">
						<span class="font-medium text-base text-white">MH</span>
					</div>
				</div>
				<span>Add graphics</span>
			</div>
			`,
      [56, 197],
    ),
    slideTextElement('text')(
      'No one likes boring text blocks on a website. And <span class="text-ably-avatar-stack-demo-slide-title-highlight font-semibold">images and icons</span> are the fastest way to get information.',
      [64, 288],
      423,
    ),
    slideTextElement('text')(
      `<div class="border-2 border-[#22BB5E] p-2 relative">
				<span class="absolute w-2 h-2 bg-white border border-[#22BB5E] -top-1 -right-1"></span>
				<span class="absolute w-2 h-2 bg-white border border-[#22BB5E] -bottom-1 -right-1"></span>
				<span class="absolute w-2 h-2 bg-white border border-[#22BB5E] -bottom-1 -left-1"></span>
				<span class="absolute -top-5 -left-0.5 py-0.5 px-2 rounded-t border-[#22BB5E] bg-[#22BB5E] text-white text-xs">Lauren</span>
				But <span class="text-ably-avatar-stack-demo-slide-title-highlight font-semibold">don't overdo it</span>. If you can't explain for what purpose you put this line or icon, it's better to abandon it.
			</div>`,
      [56, 416],
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
