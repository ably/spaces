import * as Ably from 'ably/promises';

import { nanoid } from 'nanoid';

import { getRandomName } from './utils/fake-names';
import { getSpaceNameFromUrl } from './utils/url';
import Spaces from '../../src/Spaces';
import { renderAvatars, renderSelfAvatar } from './components/avatar-stack';
import { renderFeatureDisplay } from './components/feature-display';
import { SpaceMember } from '../../src/Space';

const clientId = nanoid();

const ably = new Ably.Realtime.Promise({ authUrl: `/api/ably-token-request?clientId=${clientId}`, clientId });

const spaces = new Spaces(ably);

const space = spaces.get(getSpaceNameFromUrl(), { offlineTimeout: 60_000 });

const selfName = getRandomName();

const memberIsNotSelf = (member: SpaceMember) => member.clientId !== clientId;

space.on('membersUpdate', (members) => {
  renderAvatars(members.filter(memberIsNotSelf));
});

/** Avoids issues with top-level await: an alternative fix is to change build target to esnext */
(async () => await space.enter({ name: selfName }))();

renderSelfAvatar(selfName);
renderFeatureDisplay(space);
const initialMembers = space.getMembers();
renderAvatars(initialMembers.filter(memberIsNotSelf));
