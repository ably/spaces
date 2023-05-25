import * as Ably from 'ably/promises';
import { nanoid } from 'nanoid';

import { getRandomName } from './utils/fake-names';
import { getSpaceNameFromUrl } from './utils/url';
import Spaces from '../../src/Spaces';
import { renderAvatars, renderSelfAvatar } from './components/avatar-stack';
import { MEMBERS_UPDATE } from '../../src/utilities/Constants';
import type { SpaceMember } from '../../src/Space';
import { getRandomColor } from './utils/colors';
import { slideData } from './data/slide-data';
import { IS_SELECTED } from './data/default-slide-data';
import { renderSlidePreviewMenu } from './components/render-slide-preview-menu';
import { renderSelectedSlide } from './components/render-slide';
import { renderComments } from './components/render-comments';
import attachCursors from './components/cursors';

import Simulate from './components/simulate';

const clientId = nanoid();

const ably = new Ably.Realtime.Promise({
  authUrl: `/api/ably-token-request?clientId=${clientId}`,
  clientId,
});

const spaces = new Spaces(ably);
const space = spaces.get(getSpaceNameFromUrl(), {
  offlineTimeout: 10_000,
  cursors: { outboundBatchInterval: 100, inboundBatchInterval: 1 },
});

const selfName = getRandomName();
const selfColor = getRandomColor();
const memberIsNotSelf = (member: SpaceMember) => member.clientId !== clientId;

space.on(MEMBERS_UPDATE, (members) => {
  renderAvatars(members.filter(memberIsNotSelf));
});

declare global {
  interface Window {
    Simulate: Simulate;
  }
}

/** Avoids issues with top-level await: an alternative fix is to change build target to es */
(async () => {
  const initialMembers = await space.enter({ name: selfName, color: selfColor });
  renderSelfAvatar(selfName, selfColor);

  renderAvatars(initialMembers.filter(memberIsNotSelf));

  const initialSlide = slideData.find((slide) => slide.selected === IS_SELECTED);

  // Set initial location
  space.locations.set({ slide: initialSlide.id, element: null });
  renderSlidePreviewMenu(space);
  renderSelectedSlide(space);
  renderComments();

  let unattach = attachCursors(space, initialSlide.id);

  const sameSlideDifferentElement = (previousLocation, currentLocation) => {
    return previousLocation?.slide === currentLocation?.slide && previousLocation?.element !== currentLocation?.element;
  };

  space.locations.on('locationUpdate', (locationUpdate) => {
    renderSlidePreviewMenu(space);
    renderSelectedSlide(space);

    if (sameSlideDifferentElement(locationUpdate.previousLocation, locationUpdate.currentLocation)) return;
    unattach();
    const currentSlide = slideData.find((slide) => slide.selected === IS_SELECTED);
    unattach = attachCursors(space, currentSlide.id);
  });

  space.on('membersUpdate', (members) => {
    renderAvatars(members.filter(memberIsNotSelf));
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      space.cursors.onPageHidden();
      unattach();
    } else {
      space.cursors.onPageVisible();
      const currentSlide = slideData.find((slide) => slide.selected === IS_SELECTED);
      unattach = attachCursors(space, currentSlide.id);
    }
  });

  window.Simulate = new Simulate();
})();
