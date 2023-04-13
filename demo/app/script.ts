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

const memberIsNotSelf = (member) => member.profileData.name !== selfName;

space.on('membersUpdate', (members) => {
  renderAvatars(members.filter(memberIsNotSelf));
});

renderSelfAvatar(selfName);
renderFeatureDisplay(space);
const initialMembers = await space.getMembers();
renderAvatars(initialMembers.filter(memberIsNotSelf));

space.enter({ name: selfName });
