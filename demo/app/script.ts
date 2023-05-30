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

declare global {
  interface Window {
    Simulate: Simulate;
  }
}

const clientId = nanoid();
const selfName = getRandomName();
const selfColor = getRandomColor();
const memberIsNotSelf = (member: SpaceMember) => member.clientId !== clientId;
const currentSlide = () => slideData.find((slide) => slide.selected === IS_SELECTED);
const sameSlide = (previousLocation, currentLocation) => {
  return previousLocation?.slide === currentLocation?.slide;
};
const ably = new Ably.Realtime.Promise({
  authUrl: `/api/ably-token-request?clientId=${clientId}`,
  clientId,
});

const spaces = new Spaces(ably);
const space = await spaces.get(getSpaceNameFromUrl(), {
  offlineTimeout: 10_000,
});

space.on(MEMBERS_UPDATE, (members) => {
  renderAvatars(members.filter(memberIsNotSelf));
});

const initialMembers = await space.enter({ name: selfName, color: selfColor });
space.locations.set({ slide: currentSlide().id, element: null });

renderSelfAvatar(selfName, selfColor);
renderAvatars(initialMembers.filter(memberIsNotSelf));
renderSlidePreviewMenu(space);
renderSelectedSlide(space);
renderComments();
let detachCursors = attachCursors(space, currentSlide().id);

space.locations.on('locationUpdate', ({ previousLocation, currentLocation }) => {
  renderSlidePreviewMenu(space);
  renderSelectedSlide(space);

  if (sameSlide(previousLocation, currentLocation)) return;
  detachCursors();
  detachCursors = attachCursors(space, currentSlide().id);
});

space.on('membersUpdate', (members) => {
  renderAvatars(members.filter(memberIsNotSelf));
});

window.Simulate = new Simulate();
