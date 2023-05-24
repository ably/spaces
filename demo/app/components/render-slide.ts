import { slideData } from '../data/slide-data';
import { createFragment } from '../utils/dom';
import { queryDataId } from '../utils/dom';
import { SlideImgElement, SlideTextElement } from '../data/default-slide-data';
import { firstName } from '../utils/fake-names';

import type { Space, SpaceMember } from '../../../src';
import type { SlideData } from '../data/default-slide-data';

const elementSelectedClasses = [
  'outline-2',
  'outline',
  `before:content-[attr(data-before)]`,
  'before:absolute',
  'before:-top-[22px]',
  'before:-left-[2px]',
  'before:px-[10px]',
  'before:text-sm',
  'before:text-white',
  'before:rounded-t-lg',
  'before:normal-case',
];

const amendPresentOutline = (members, htmlElement) => {
  const lastEnteredMember = members[members.length - 1];

  if (!lastEnteredMember) {
    htmlElement.setAttribute('data-before', '');
    htmlElement.classList.remove(...elementSelectedClasses);
    return;
  }

  htmlElement.setAttribute('data-before', firstName(lastEnteredMember.profileData.name));

  htmlElement.classList.add(
    ...elementSelectedClasses,
    `outline-${lastEnteredMember.profileData.color.name}-${lastEnteredMember.profileData.color.gradientStart.intensity}`,
    `before:bg-${lastEnteredMember.profileData.color.name}-${lastEnteredMember.profileData.color.gradientStart.intensity}`,
  );
};

const renderSlideTextElement = (slideData: SlideTextElement, htmlElement: HTMLElement, members: SpaceMember[]) => {
  htmlElement.style.left = `${slideData.position[0]}px`;
  htmlElement.style.top = `${slideData.position[1]}px`;
  htmlElement.innerHTML = slideData.text;

  if (slideData.width) {
    htmlElement.style.width = `${slideData.width}px`;
  }

  amendPresentOutline(members, htmlElement);
};

const renderSlideImgElement = (slideData: SlideImgElement, htmlElement: HTMLElement, members: SpaceMember[]) => {
  htmlElement.style.left = `${slideData.position[0]}px`;
  htmlElement.style.top = `${slideData.position[1]}px`;
  const imgElement = queryDataId(htmlElement, 'slide-image-placeholder') as HTMLImageElement;
  imgElement.src = slideData.src;

  amendPresentOutline(members, htmlElement);
};

const addElementListener = (space, node, slideId, elementId) => {
  if (space) {
    node.addEventListener('click', () => {
      space.locations.set({ slide: slideId, element: elementId });
    });
  }
};

const renderSlide = (slideContainer: HTMLElement, slideData: SlideData, members: SpaceMember[], space?: Space) => {
  slideData.elements.forEach((element) => {
    let slideElementFragment: HTMLElement;
    const presentMembers = members.filter(
      (member) => member.location && member.location.element === element.id && member.isConnected,
    );

    switch (element.elementType) {
      case 'title': {
        slideElementFragment = createFragment('#slide-title');
        const slotElement = queryDataId(slideElementFragment, 'slide-title-text');
        addElementListener(space, slotElement, slideData.id, element.id);
        renderSlideTextElement(element, slotElement, presentMembers);
        break;
      }
      case 'subtitle': {
        slideElementFragment = createFragment('#slide-subtitle');
        const slotElement = queryDataId(slideElementFragment, 'slide-subtitle-text');
        addElementListener(space, slotElement, slideData.id, element.id);
        renderSlideTextElement(element, slotElement, presentMembers);
        break;
      }
      case 'title-caption': {
        slideElementFragment = createFragment('#slide-title-caption');
        const slotElement = queryDataId(slideElementFragment, 'slide-title-caption-text');
        addElementListener(space, slotElement, slideData.id, element.id);
        renderSlideTextElement(element, slotElement, presentMembers);
        break;
      }
      case 'text': {
        slideElementFragment = createFragment('#slide-text-block');
        const slotElement = queryDataId(slideElementFragment, 'slide-text-block-text');
        addElementListener(space, slotElement, slideData.id, element.id);
        renderSlideTextElement(element, slotElement, presentMembers);
        break;
      }
      case 'aside-text': {
        slideElementFragment = createFragment('#slide-aside-text');
        const slotElement = queryDataId(slideElementFragment, 'slide-aside-text');
        addElementListener(space, slotElement, slideData.id, element.id);
        renderSlideTextElement(element, slotElement, presentMembers);
        break;
      }
      case 'img': {
        slideElementFragment = createFragment('#slide-image');
        const slotElement = slideElementFragment.querySelector('figure');
        addElementListener(space, slotElement, slideData.id, element.id);
        renderSlideImgElement(element, slotElement as HTMLImageElement, presentMembers);
        break;
      }
      default:
        throw `Element Type not recognized`;
    }

    slideContainer.appendChild(slideElementFragment);
  });

  return slideContainer;
};

const renderSelectedSlide = (space: Space) => {
  const selectedSlide = slideData.find((data) => data.selected);
  const members = space.getMembers();
  const presentMembers = members.filter((member) => member.location && member.location.slide === selectedSlide.id);
  const selectedSlideContainer = document.querySelector('#slide-selected') as HTMLElement;
  const wrapper = queryDataId(selectedSlideContainer, 'slide-wrapper');
  wrapper.innerHTML = '';
  renderSlide(wrapper, selectedSlide, presentMembers, space);
};

export { renderSlide, renderSelectedSlide };
