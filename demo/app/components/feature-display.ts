import { SlideData, SlideImgElement, SlideTextElement } from "../data/default-slide-data";
import { slideData } from "../data/slide-data";
import { createFragment } from "../utils/dom";

export const renderFeatureDisplay = () => {
  renderSlidePreviewMenu();
  renderSelectedSlide();
  renderComments();
};

const renderSlidePreviewMenu = () => {
  const slidePreviewMenuContainer = document.querySelector('#slide-left-preview-list');
  slideData.forEach(slide => {
    const slidePreviewFragment = createFragment('#slide-preview') as HTMLElement;
    const slidePreviewContainer = slidePreviewFragment.querySelector('li[data-id=slide-preview-container]') as HTMLElement;
    renderSlide(slidePreviewContainer, slide);
    slidePreviewMenuContainer.appendChild(slidePreviewContainer);
  });
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

const renderSlideImgElement = (slideElement: SlideImgElement, htmlElement: HTMLImageElement) => {
  htmlElement.src = slideElement.src;
  htmlElement.style.position = 'absolute';
  htmlElement.style.left = `${slideElement.position[0]}px`;
  htmlElement.style.top = `${slideElement.position[1]}px`;
  return htmlElement;
}

const renderSlide = (containerElement: HTMLElement, slideData: SlideData) => {
  slideData.elements.forEach((element) => {
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
        renderSlideImgElement(
          element,
          slideElementFragment.querySelector('img[data-id=slide-image-placeholder]')
        );
        break;
      default:
        throw `Element Type not recognized`;
    }
    containerElement.appendChild(slideElementFragment);
  });
}

const renderSelectedSlide = () => {
  const selectedSlide = slideData.find((data) => data.selected);
  if(selectedSlide) {
    const selectedSlideContainer = document.querySelector('#slide-selected') as HTMLElement;
    renderSlide(selectedSlideContainer, selectedSlide);
  }
};

const renderComments = () => {

};
