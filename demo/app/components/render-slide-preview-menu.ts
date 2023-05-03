import Space, { SpaceMember } from '../../../src/Space';
import { IS_NOT_SELECTED, IS_SELECTED } from '../data/default-slide-data';
import { slideData } from '../data/slide-data';
import { addLocationTracking } from '../location-tracking/add-location-tracking';
import { HTMLElementManager } from '../location-tracking/location-change-handlers';
import { createSlideElementManager } from '../location-tracking/track-slides';
import { createFragment } from '../utils/dom';
import { renderSelectedSlide, renderSlide } from './render-slide';

const addPresentMembers = (
  members: { member: SpaceMember; i: number }[],
  selfId: string,
  slotElement: HTMLElement,
  manager: HTMLElementManager,
) =>
  members.forEach(({ member, i }) => {
    manager.selector(
      slotElement,
      member.profileData.name ? member.profileData.name.split(/\s/)[0] : '',
      member.clientId,
      selfId,
      i,
    );
  });

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

  const selfId = space.getSelf()?.clientId;
  const members = space.getMembers();

  slideData.forEach((slide, i) => {
    const slidePreviewFragment = createFragment('#slide-preview') as HTMLElement;

    const slideId = `slide-${i}`;

    const presentMembers = members
      .map((member, i) => ({ member, i }))
      .filter(({ member }) => member.location && member.location.startsWith(slideId));

    const slidePreviewListItem = slidePreviewFragment.querySelector(
      'li[data-id=slide-preview-list-item]',
    ) as HTMLLIElement;
    slidePreviewListItem.setAttribute('id', `preview-${slideId}`);

    const slideElementManager = createSlideElementManager(space, slideId);

    addPresentMembers(presentMembers, selfId, slidePreviewListItem, slideElementManager);
    addLocationTracking(slideId, slidePreviewListItem, slideElementManager, space);

    slidePreviewListItem.addEventListener('click', () => {
      const currentSlideIndex = slideData.findIndex((slide) => slide.selected === IS_SELECTED);
      if (currentSlideIndex > -1) {
        slideData[currentSlideIndex].selected = IS_NOT_SELECTED;
      }
      slideData[i].selected = IS_SELECTED;
      rerenderSelectedSlidePreviews();
      renderSelectedSlide(space);
      space.locations.set(slideId);
    });

    if (slide.selected) {
      slidePreviewListItem.style.backgroundColor = '#EEE9FF';
      space.locations.set(`slide-${slide.id}`);

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
