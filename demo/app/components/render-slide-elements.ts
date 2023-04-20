import { SlideImgElement, SlideTextElement } from '../data/default-slide-data';

const renderSlideTextElement = (slideElement: SlideTextElement, htmlElement: HTMLElement) => {
  htmlElement.innerHTML = slideElement.text;
  htmlElement.style.position = 'absolute';
  htmlElement.style.left = `${slideElement.position[0]}px`;
  htmlElement.style.top = `${slideElement.position[1]}px`;
  if (slideElement.width) {
    htmlElement.style.width = `${slideElement.width}px`;
  }
  return htmlElement;
};

const renderSlideImgElement = (slideElement: SlideImgElement, htmlElement: HTMLImageElement) => {
  htmlElement.src = slideElement.src;
  htmlElement.style.position = 'absolute';
  htmlElement.style.left = `${slideElement.position[0]}px`;
  htmlElement.style.top = `${slideElement.position[1]}px`;
  return htmlElement;
};

export { renderSlideImgElement, renderSlideTextElement };
