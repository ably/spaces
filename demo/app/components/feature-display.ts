import { SlideTextElement } from "../data/default-slide-data";
import { slideData } from "../data/slide-data";
import { createFragment } from "../utils/dom";

export const renderFeatureDisplay = () => {
  renderSlidePreviewMenu();
  renderSelectedSlide();
  renderComments();
};

const renderSlidePreviewMenu = () => {

};

const renderSlideTextElement = (slideElement: SlideTextElement, htmlElement: HTMLElement) => {
  htmlElement.innerHTML = slideElement.text;
  htmlElement.style.position = 'absolute';
  htmlElement.style.left = `${slideElement.position[0]}px`;
  htmlElement.style.top = `${slideElement.position[1]}px`;
  if(slideElement.width) {
    htmlElement.style.width = `${slideElement.width}px`;
  }
  return htmlElement;
}

const renderSelectedSlide = () => {
  const selectedSlide = slideData.find((data) => data.selected);
  if(selectedSlide) {
    const selectedSlideContainer = document.querySelector('#slide-selected');
    selectedSlide.elements.forEach((element) => {
      let slideElementFragment: HTMLElement;
      switch(element.elementType) {
        case 'title':
          slideElementFragment = createFragment('#slide-title') as HTMLElement;
          renderSlideTextElement(
            element,
            slideElementFragment.querySelector('[data-id=slide-title-text]')
          );
          break;
        case 'title-caption':
          slideElementFragment = createFragment('#slide-title-caption') as HTMLElement;
          renderSlideTextElement(
            element,
            slideElementFragment.querySelector('[data-id=slide-title-caption-text]')
          );
          break;
        case 'text':
          slideElementFragment = createFragment('#slide-text-block') as HTMLElement;
          renderSlideTextElement(
            element,
            slideElementFragment.querySelector('[data-id=slide-text-block-text]')
          );
          break;
        case 'img':
          slideElementFragment = createFragment('#slide-image') as HTMLElement;
          break;
        default:
          throw `Element Type not recognized`;
      }
      selectedSlideContainer.appendChild(slideElementFragment);
    })
  }
};

const renderComments = () => {

};
