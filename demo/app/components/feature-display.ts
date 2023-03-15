import { slideData } from "../data/slide-data";
import { createFragment } from "../utils/dom";

export const renderFeatureDisplay = () => {
  renderSlidePreviewMenu();
  renderSelectedSlide();
  renderComments();
};

const renderSlidePreviewMenu = () => {

};

const renderSelectedSlide = () => {
  const selectedSlide = slideData.find((data) => data.selected);
  if(selectedSlide) {
    const selectedSlideContainer = document.querySelector('#slide-selected');
    selectedSlide.elements.forEach((element) => {
      let slideElementFragment: HTMLElement;
      switch(element.elementType) {
        case 'title':
          slideElementFragment = createFragment('#slide-title') as HTMLElement;
          slideElementFragment.querySelector('[data-id=slide-title-text]').innerHTML = element.text;
          break;
        case 'title-caption':
          slideElementFragment = createFragment('#slide-title-caption') as HTMLElement;
          slideElementFragment.querySelector('[data-id=slide-title-caption-text]').innerHTML = element.text;
          break;
        case 'text':
          slideElementFragment = createFragment('#slide-text-block') as HTMLElement;
          slideElementFragment.querySelector('[data-id=slide-text-block-text]').innerHTML = element.text;
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
