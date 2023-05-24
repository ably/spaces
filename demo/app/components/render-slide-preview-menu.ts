import { IS_NOT_SELECTED, IS_SELECTED } from '../data/default-slide-data';
import { createFragment } from '../utils/dom';
import { renderSlide } from './render-slide';
import { queryDataId } from '../utils/dom';
import { slideData } from '../data/slide-data';
import { nameToInitials } from '../utils/fake-names';

import type { Space, SpaceMember } from '../../../src';

const renderPreviewAvatar = (member: SpaceMember) => {
  const fragment = createFragment('#avatar-template');
  const initials = queryDataId(fragment, 'name');
  initials.innerHTML = nameToInitials(member.profileData.name);

  const innerWrapper = queryDataId(fragment, 'avatar-inner-wrapper');
  const wrapper = queryDataId(fragment, 'avatar-wrapper');
  const hover = queryDataId(fragment, 'avatar-hover');
  wrapper.removeChild(hover);

  if (member.isConnected) {
    innerWrapper.classList.add(
      'bg-gradient-to-b',
      member.profileData.color.gradientStart.tw,
      member.profileData.color.gradientEnd.tw,
    );
    innerWrapper.classList.remove('bg-[##D0D3DC]');
  } else {
    innerWrapper.classList.add('bg-[#D0D3DC]');
    innerWrapper.classList.remove(
      'bg-gradient-to-b',
      member.profileData.color.gradientStart.tw,
      member.profileData.color.gradientEnd.tw,
    );
  }

  return fragment;
};

const renderAvatarOverflow = (members) => {
  const count = members.length;
  const li = createFragment('#slide-preview-avatar-stack-li').querySelector('li');
  const fragment = createFragment('#avatar-template');
  const countNode = queryDataId(fragment, 'name');
  countNode.innerHTML = `+${count}`;

  const wrapper = queryDataId(fragment, 'avatar-wrapper');
  wrapper.classList.remove('bg-gradient-to-b');
  wrapper.classList.add('bg-[#75A3E3]');

  const hover = queryDataId(fragment, 'avatar-hover');
  wrapper.removeChild(hover);

  li.appendChild(fragment);

  return li;
};

const MAX_SHOWN_MEMBERS = 3;

const renderPreviewAvatarStack = (slideMembers: SpaceMember[]) => {
  const ul = createFragment('#slide-preview-avatar-stack').querySelector('ul');

  const showMembers = slideMembers.slice(0, MAX_SHOWN_MEMBERS);
  const hiddenMembers = slideMembers.slice(MAX_SHOWN_MEMBERS);

  showMembers.forEach((member) => {
    const avatar = renderPreviewAvatar(member);
    const li = createFragment('#slide-preview-avatar-stack-li').querySelector('li');
    li.appendChild(avatar);
    ul.appendChild(li);
  });

  if (hiddenMembers.length > 0) {
    ul.appendChild(renderAvatarOverflow(hiddenMembers));
  }

  return ul;
};

const renderSlidePreviewMenu = (space: Space) => {
  const slidePreviewMenuContainer = document.querySelector('#slide-left-preview-list');
  slidePreviewMenuContainer.innerHTML = '';

  const members = space.getMembers();
  const selectedSlide = slideData.find((data) => data.selected);

  slideData.forEach((slide, i) => {
    const slidePreviewFragment = createFragment('#slide-preview') as HTMLElement;
    const slidePreviewListItem = queryDataId(slidePreviewFragment, 'slide-preview-list-item');

    const slideId = `${i}`;
    const presentMembers: SpaceMember[] = members.filter(
      (member) => member.location && member.location.slide === slideId,
    );
    slidePreviewListItem.id = `preview-${slideId}`;

    const slidePreviewNumber = queryDataId(slidePreviewFragment, 'slide-preview-number');
    slidePreviewNumber.innerText = `${i + 1}`;

    const slideContainer = queryDataId(slidePreviewFragment, 'slide-preview-container');
    renderSlide(slideContainer, slide, presentMembers);
    const slideAvatarStack = renderPreviewAvatarStack(presentMembers);

    slidePreviewListItem.addEventListener('click', () => {
      const currentSlideIndex = slideData.findIndex((slide) => slide.selected === IS_SELECTED);

      if (currentSlideIndex > -1) {
        slideData[currentSlideIndex].selected = IS_NOT_SELECTED;
      }

      slideData[i].selected = IS_SELECTED;
      space.locations.set({ slide: slideId, element: null });
    });

    if (selectedSlide.id === slide.id) {
      slidePreviewListItem.classList.add('bg-[#EEE9FF]');

      const slidePreviewSelectedIndicator = queryDataId(slidePreviewFragment, 'slide-preview-selected-indicator');
      const selectedIndicatorSVG = createFragment('#selected-slide-preview');
      slidePreviewSelectedIndicator.appendChild(selectedIndicatorSVG);
      slidePreviewListItem.appendChild(slidePreviewSelectedIndicator);
    }

    if (presentMembers.length > 0) {
      slidePreviewListItem.classList.add('mb-[140px]');
    }

    slidePreviewListItem.appendChild(slidePreviewNumber);
    slidePreviewListItem.appendChild(slideContainer);
    slidePreviewListItem.appendChild(slideAvatarStack);
    slidePreviewMenuContainer.appendChild(slidePreviewListItem);
  });
};

export { renderSlidePreviewMenu };
