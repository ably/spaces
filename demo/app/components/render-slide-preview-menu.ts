import Space from '../../../src/Space';
import { IS_NOT_SELECTED, IS_SELECTED } from '../data/default-slide-data';
import { slideData } from '../data/slide-data';
import { addLocationTracking } from '../location-tracking/add-location-tracking';
import { createSlideElementManager } from '../location-tracking/track-slide-elements';
import { createFragment } from '../utils/dom';
import { renderSelectedSlide, renderSlide } from './render-slide';

const rerenderSelectedSlidePreviews = () => {
  slideData.forEach((slide, i) => {
    const element = document.getElementById(`preview-slide-${i}`);
    delete element.style.backgroundColor;
    (element.querySelector('div[data-id=slide-preview-selected-indicator]') as HTMLElement).innerHTML = '';
    if (slide.selected === IS_SELECTED) {
      element.style.backgroundColor = '#EEE9FF';

      const slidePreviewSelectedIndicator = element.querySelector(
        'div[data-id=slide-preview-selected-indicator]',
      ) as HTMLElement;
      const selectedIndicatorSVG = createFragment('#selected-slide-preview');
      slidePreviewSelectedIndicator.appendChild(selectedIndicatorSVG);

      element.prepend(slidePreviewSelectedIndicator);
    } else {
      element.style.backgroundColor = 'transparent';
    }
  });
};

const renderSlidePreviewMenu = (space: Space) => {
  const slidePreviewMenuContainer = document.querySelector('#slide-left-preview-list');

  slideData.forEach((slide, i) => {
    const slidePreviewFragment = createFragment('#slide-preview') as HTMLElement;

    const slidePreviewListItem = slidePreviewFragment.querySelector(
      'li[data-id=slide-preview-list-item]',
    ) as HTMLLIElement;
    slidePreviewListItem.setAttribute('id', `preview-slide-${i}`);

    addLocationTracking(`slide-${i}`, slidePreviewListItem, createSlideElementManager(space, `slide-${i}`), space);

    slidePreviewListItem.addEventListener('click', () => {
      const currentSlideIndex = slideData.findIndex((slide) => slide.selected === IS_SELECTED);
      if (currentSlideIndex > -1) {
        slideData[currentSlideIndex].selected = IS_NOT_SELECTED;
      }
      slideData[i].selected = IS_SELECTED;
      rerenderSelectedSlidePreviews();
      renderSelectedSlide(space);
      space.locations.set(`slide-${i}`);
    });

    if (slide.selected) {
      slidePreviewListItem.style.backgroundColor = '#EEE9FF';

      const slidePreviewSelectedIndicator = slidePreviewFragment.querySelector(
        'div[data-id=slide-preview-selected-indicator]',
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

    renderSlide(slidePreviewContainer, slide, space);

    slidePreviewListItem.appendChild(slidePreviewNumber);
    slidePreviewListItem.appendChild(slidePreviewContainer);

    slidePreviewMenuContainer.appendChild(slidePreviewListItem);
  });
};

export { renderSlidePreviewMenu };
