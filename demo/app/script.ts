import * as Ably from 'ably/promises';

import { identicon } from 'minidenticons';
import { nanoid } from 'nanoid';

import { getRandomName } from './utils/fake-names';

import Spaces from '../../src/Spaces';

const DEFAULT_SPACE_NAME = 'spaces-demo';

const getSpaceName = () => {
  const url = new URL(location.href);
  const spaceName = url.searchParams.get('space');

  return spaceName ? spaceName : DEFAULT_SPACE_NAME;
};

const renderAvatar = (member, showConnectionStatus = true) => {
  const node = document.querySelector<HTMLTemplateElement>('#avatar-template').content.cloneNode(true);

  const name = (node as HTMLElement).querySelector('[data-id="name"]');
  const imageWrapper = (node as HTMLElement).querySelector('[data-id="avatar"]');

  name.innerHTML = member.data.name;
  imageWrapper.innerHTML = member.data.avatarSvg;

  if (showConnectionStatus) {
    const action = (node as HTMLElement).querySelector('[data-id="action"]');
    (action as HTMLElement).style.display = 'block';
    action.innerHTML = member.isConnected ? 'Has left: No' : 'Has left: Yes';
    const lastSeen = (node as HTMLElement).querySelector('[data-id="last-seen"]');
    (lastSeen as HTMLElement).style.display = 'block';
    const lastSeenDate = new Date(member.lastEvent.timestamp);
    lastSeen.innerHTML = `Last seen: ${lastSeenDate.getHours()}:${lastSeenDate.getMinutes()}`;
  }

  return node;
};

const renderAvatarStack = (members) => {
  const container = document.querySelector('#avatar-stack');
  container.innerHTML = '';

  const ul = document.createElement('ul');

  members.forEach((member) => {
    const li = document.createElement('li');
    li.appendChild(renderAvatar(member));
    ul.appendChild(li);
  });

  container.appendChild(ul);
};

const renderSelfAvatar = (self) => {
  const container = document.querySelector('#avatar-self');
  container.innerHTML = '';
  container.appendChild(renderAvatar(self, false));
};

(async () => {
  const clientId = nanoid();
  const ably = new Ably.Realtime.Promise({ authUrl: `/api/ably-token-request?clientId=${clientId}`, clientId });

  const spaces = new Spaces(ably);
  const space = spaces.get(getSpaceName(), { offlineTimeout: 5_000 });

  const name = getRandomName();
  const avatarSvg = identicon(name);
  const initialMembers = await space.enter({ name, avatarSvg });

  space.on('membersUpdate', (members) => {
    renderAvatarStack(members);
  });

  renderSelfAvatar({ data: { name, avatarSvg } });
  renderAvatarStack(initialMembers);
})();
