import * as Ably from 'ably/promises';

import { nanoid } from 'nanoid';

import { getRandomName } from './utils/fake-names';
import { getSpaceNameFromUrl } from './utils/url';

import Spaces from '../../src/Spaces';
import { renderAvatars, renderSelfAvatar } from './components/avatar-stack';
import { renderFeatureDisplay } from './components/feature-display';

export const spaces = (async () => {
  const clientId = nanoid();
  const ably = new Ably.Realtime.Promise({ authUrl: `/api/ably-token-request?clientId=${clientId}`, clientId });

  const spaces = new Spaces(ably);
  const space = spaces.get(getSpaceNameFromUrl(), { offlineTimeout: 60_000 });

  const name = getRandomName();
  console.log(name);
  const initialMembers = await space.enter({ name });

  space.on('membersUpdate', (members) => {
    console.log(members);
    renderAvatars(members);
  });

  renderSelfAvatar(name);
  renderAvatars(initialMembers);
  renderFeatureDisplay();

  return spaces;
})();
