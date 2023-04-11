import * as Ably from 'ably/promises';

import { nanoid } from 'nanoid';

import { getRandomName } from './utils/fake-names';
import { getSpaceNameFromUrl } from './utils/url';
import Spaces from '../../src/Spaces';
import { renderAvatars, renderSelfAvatar } from './components/avatar-stack';
import { renderFeatureDisplay } from './components/feature-display';

const clientId = nanoid();

const ably = new Ably.Realtime.Promise({ authUrl: `/api/ably-token-request?clientId=${clientId}`, clientId });

const spaces = new Spaces(ably);

export const space = spaces.get(getSpaceNameFromUrl(), { offlineTimeout: 60_000 });

export const selfName = getRandomName();

space.on('membersUpdate', (members) => {
  console.log('firing');
  renderSelfAvatar(selfName);
  renderAvatars(members.filter((member) => member.profileData.name !== selfName));
  renderFeatureDisplay(space);
});

renderSelfAvatar(selfName);
renderFeatureDisplay(space);

space.enter({ name: selfName });
