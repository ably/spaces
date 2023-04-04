import { SlideData, SlideImgElement, SlideTextElement } from '../data/default-slide-data';
import { slideData } from '../data/slide-data';
import { createFragment } from '../utils/dom';
import { gradients } from '../utils/gradients';

export const renderFeatureDisplay = () => {
  renderSlidePreviewMenu();
  renderSelectedSlide();
  renderComments();
};

const renderSlidePreviewMenu = () => {
  const slidePreviewMenuContainer = document.querySelector('#slide-left-preview-list');
  slideData.forEach((slide, i) => {
    const slidePreviewFragment = createFragment('#slide-preview') as HTMLElement;

    const slidePreviewListItem = slidePreviewFragment.querySelector(
      'li[data-id=slide-preview-list-item]',
    ) as HTMLLIElement;
    if (slide.selected) {
      slidePreviewListItem.style.backgroundColor = '#EEE9FF';

      const slidePreviewSelectedIndicator = slidePreviewFragment.querySelector(
        'div[data-id=slide-preview-selected-indicator',
      ) as HTMLElement;
      const selectedIndicatorSVG = createFragment('#selected-slide-preview');
      slidePreviewSelectedIndicator.appendChild(selectedIndicatorSVG);

      slidePreviewListItem.appendChild(slidePreviewSelectedIndicator);
    }

    const slidePreviewNumber = slidePreviewFragment.querySelector('p[data-id=slide-preview-number]') as HTMLElement;
    slidePreviewNumber.innerText = `${i + 1}`;

    const slidePreviewContainer = slidePreviewFragment.querySelector(
      'div[data-id=slide-preview-container]',
    ) as HTMLElement;

    renderSlide(slidePreviewContainer, slide);

    slidePreviewListItem.appendChild(slidePreviewNumber);
    slidePreviewListItem.appendChild(slidePreviewContainer);

    slidePreviewMenuContainer.appendChild(slidePreviewListItem);
  });
};

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

const renderSlide = (containerElement: HTMLElement, slideData: SlideData) => {
  containerElement.style.backgroundColor = '#FFF';
  slideData.elements.forEach((element) => {
    let slideElementFragment: HTMLElement;
    switch (element.elementType) {
      case 'title':
        slideElementFragment = createFragment('#slide-title') as HTMLElement;
        renderSlideTextElement(element, slideElementFragment.querySelector('[data-id=slide-title-text]'));
        break;
      case 'title-caption':
        slideElementFragment = createFragment('#slide-title-caption') as HTMLElement;
        renderSlideTextElement(element, slideElementFragment.querySelector('[data-id=slide-title-caption-text]'));
        break;
      case 'text':
        slideElementFragment = createFragment('#slide-text-block') as HTMLElement;
        renderSlideTextElement(element, slideElementFragment.querySelector('[data-id=slide-text-block-text]'));
        break;
      case 'img':
        slideElementFragment = createFragment('#slide-image') as HTMLElement;
        renderSlideImgElement(element, slideElementFragment.querySelector('img[data-id=slide-image-placeholder]'));
        break;
      default:
        throw `Element Type not recognized`;
    }
    containerElement.appendChild(slideElementFragment);
  });
};

const renderSelectedSlide = () => {
  const selectedSlide = slideData.find((data) => data.selected);
  if (selectedSlide) {
    const selectedSlideContainer = document.querySelector('#slide-selected') as HTMLElement;
    renderSlide(selectedSlideContainer, selectedSlide);
  }
};

const renderComments = () => {
  const commentData = [
    {
      name: 'John Doe',
      comment: 'Hey - that looks amazing! Can we make this title larger?',
      position: '#3 - Slide 2',
    },
    {
      name: 'Timmy Bahama',
      comment: 'Can we add some more text to this slide?',
      position: '#3 - Slide 2',
    },
    {
      name: 'Frankie B. Good',
      comment: 'I like this slide, but can we change the color of the text?',
      position: '#3 - Slide 3',
    },
  ];

  const commentContainer = document.querySelector('#comments-container') as HTMLElement;
  const commentDrawer = createFragment('#comment-drawer') as HTMLElement;
  const commentThreadContainer = commentDrawer.querySelector('ul[data-id=comment-thread-container]') as HTMLElement;

  commentContainer.appendChild(commentDrawer);

  commentData.forEach((comment, index) => {
    const commentThreadFragment = createFragment('#comment-thread') as HTMLElement;
    const commentThreadName = commentThreadFragment.querySelector('p[data-id=comment-thread-name]') as HTMLElement;
    const commentThreadComment = commentThreadFragment.querySelector(
      'p[data-id=comment-thread-comment]',
    ) as HTMLElement;
    const commentThreadPosition = commentThreadFragment.querySelector(
      'p[data-id=comment-thread-position]',
    ) as HTMLElement;
    const commentAvatar = commentThreadFragment.querySelector('span[data-id=comment-avatar]') as HTMLImageElement;

    commentThreadName.innerText = comment.name;
    commentThreadComment.innerText = comment.comment;
    commentThreadPosition.innerText = comment.position;

    const initials = comment.name
      .split(' ')
      .map((name) => name[0])
      .join('');
    commentAvatar.innerText = initials;
    commentAvatar.classList.add('bg-gradient-to-b', gradients[index][0], gradients[index][1]);

    commentThreadContainer.appendChild(commentThreadFragment);
  });
};