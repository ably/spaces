import Space from '../../../src/Space';
import { SlideData } from '../data/default-slide-data';
import { slideData } from '../data/slide-data';
import { addLocationTracking } from '../location-tracking/add-location-tracking';
import { textElementManager } from '../location-tracking/track-text-elements';
import { createFragment } from '../utils/dom';
import { renderSlideImgElement, renderSlideTextElement } from './render-slide-elements';

const renderSlide = (containerElement: HTMLElement, slideData: SlideData, space: Space) => {
  const { id: currentSlideId } = slideData;
  containerElement.style.backgroundColor = '#FFF';
  containerElement.innerHTML = '';
  slideData.elements.forEach((element) => {
    let slideElementFragment: HTMLElement;
    let slotElement: HTMLElement | HTMLImageElement;
    const elementId = `slide-${currentSlideId}-element-${element.id}`;
    switch (element.elementType) {
      case 'title':
        slideElementFragment = createFragment('#slide-title') as HTMLElement;
        slotElement = slideElementFragment.querySelector('[data-id=slide-title-text]');
        addLocationTracking(elementId, slotElement, textElementManager, space);
        renderSlideTextElement(element, slotElement);
        break;
      case 'subtitle':
        slideElementFragment = createFragment('#slide-subtitle') as HTMLElement;
        slotElement = slideElementFragment.querySelector('[data-id=slide-subtitle-text]');
        addLocationTracking(elementId, slotElement, textElementManager, space);
        renderSlideTextElement(element, slotElement);
        break;
      case 'title-caption':
        slideElementFragment = createFragment('#slide-title-caption') as HTMLElement;
        slotElement = slideElementFragment.querySelector('[data-id=slide-title-caption-text]');
        addLocationTracking(elementId, slotElement, textElementManager, space);
        renderSlideTextElement(element, slotElement);
        break;
      case 'text':
        slideElementFragment = createFragment('#slide-text-block') as HTMLElement;
        slotElement = slideElementFragment.querySelector('[data-id=slide-text-block-text]');
        addLocationTracking(elementId, slotElement, textElementManager, space);
        renderSlideTextElement(element, slotElement);
        break;
      case 'aside-text':
        slideElementFragment = createFragment('#slide-aside-text') as HTMLElement;
        slotElement = slideElementFragment.querySelector('[data-id=slide-aside-text]');
        addLocationTracking(elementId, slotElement, textElementManager, space);
        renderSlideTextElement(element, slotElement);
        break;
      case 'img':
        slideElementFragment = createFragment('#slide-image') as HTMLElement;
        slotElement = slideElementFragment.querySelector('[data-id=slide-image-placeholder]');
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
