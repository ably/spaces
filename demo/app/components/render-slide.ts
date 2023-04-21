import Space, { SpaceMember } from '../../../src/Space';
import { SlideData } from '../data/default-slide-data';
import { slideData } from '../data/slide-data';
import { addLocationTracking } from '../location-tracking/add-location-tracking';
import { slideElementManager } from '../location-tracking/track-slide-elements';
import { createFragment } from '../utils/dom';
import { renderSlideImgElement, renderSlideTextElement } from './render-slide-elements';

const addPresentMembers = (members: { member: SpaceMember; i: number }[], selfId: string, slotElement: HTMLElement) =>
  members.forEach(({ member, i }) => {
    slideElementManager.selector(
      slotElement,
      member.profileData.name ? member.profileData.name.split(/\s/)[0] : '',
      member.clientId,
      selfId,
      i,
    );
  });

const renderSlide = (containerElement: HTMLElement, slideData: SlideData, space: Space) => {
  const { id: currentSlideId } = slideData;
  containerElement.style.backgroundColor = '#FFF';
  containerElement.innerHTML = '';

  const selfId = space.getSelf()?.clientId;
  const members = space.getMembers().filter((member) => member.clientId !== selfId);

  slideData.elements.forEach((element) => {
    let slideElementFragment: HTMLElement;
    let slotElement: HTMLElement | HTMLImageElement;
    const elementId = `slide-${currentSlideId}-element-${element.id}`;
    const presentMembers = members
      .map((member, i) => ({ member, i }))
      .filter(({ member }) => member.location && member.location.startsWith(elementId));

    switch (element.elementType) {
      case 'title':
        slideElementFragment = createFragment('#slide-title') as HTMLElement;
        slotElement = slideElementFragment.querySelector('[data-id=slide-title-text]');
        addPresentMembers(presentMembers, selfId, slotElement);
        addLocationTracking(elementId, slotElement, slideElementManager, space);
        renderSlideTextElement(element, slotElement);
        break;
      case 'subtitle':
        slideElementFragment = createFragment('#slide-subtitle') as HTMLElement;
        slotElement = slideElementFragment.querySelector('[data-id=slide-subtitle-text]');
        addPresentMembers(presentMembers, selfId, slotElement);
        addLocationTracking(elementId, slotElement, slideElementManager, space);
        renderSlideTextElement(element, slotElement);
        break;
      case 'title-caption':
        slideElementFragment = createFragment('#slide-title-caption') as HTMLElement;
        slotElement = slideElementFragment.querySelector('[data-id=slide-title-caption-text]');
        addPresentMembers(presentMembers, selfId, slotElement);
        addLocationTracking(elementId, slotElement, slideElementManager, space);
        renderSlideTextElement(element, slotElement);
        break;
      case 'text':
        slideElementFragment = createFragment('#slide-text-block') as HTMLElement;
        slotElement = slideElementFragment.querySelector('[data-id=slide-text-block-text]');
        addPresentMembers(presentMembers, selfId, slotElement);
        addLocationTracking(elementId, slotElement, slideElementManager, space);
        renderSlideTextElement(element, slotElement);
        break;
      case 'aside-text':
        slideElementFragment = createFragment('#slide-aside-text') as HTMLElement;
        slotElement = slideElementFragment.querySelector('[data-id=slide-aside-text]');
        addPresentMembers(presentMembers, selfId, slotElement);
        addLocationTracking(elementId, slotElement, slideElementManager, space);
        renderSlideTextElement(element, slotElement);
        break;
      case 'img':
        slideElementFragment = createFragment('#slide-image') as HTMLElement;
        slotElement = slideElementFragment.querySelector('figure');
        addPresentMembers(presentMembers, selfId, slotElement);
        addLocationTracking(elementId, slotElement, slideElementManager, space);
        renderSlideImgElement(element, slotElement as HTMLImageElement);
        break;
      default:
        throw `Element Type not recognized`;
    }

    containerElement.appendChild(slideElementFragment);
  });
};

const renderSelectedSlide = (space: Space) => {
  const selectedSlide = slideData.find((data) => data.selected);
  if (selectedSlide) {
    const selectedSlideContainer = document.querySelector('#slide-selected') as HTMLElement;
    renderSlide(selectedSlideContainer, selectedSlide, space);
  }
};

export { renderSlide, renderSelectedSlide };
