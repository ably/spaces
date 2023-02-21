import * as Ably from 'ably/promises';

import { nanoid } from 'nanoid';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { getRandomName } from './utils/fake-names';
import { gradients } from './utils/gradients';

import Spaces from '../../src/Spaces';

dayjs.extend(relativeTime);

const DEFAULT_SPACE_NAME = 'spaces-demo';

const getSpaceName = () => {
  const url = new URL(location.href);
  const spaceName = url.searchParams.get('space');

  return spaceName ? spaceName : DEFAULT_SPACE_NAME;
};

const nameToInitials = (name) =>
  name
    .split(' ')
    .map((str) => str[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const renderAvatarStack = (members) => {
  const container = document.querySelector('#avatar-stack');
  container.innerHTML = '';

  const ul = document.createElement('ul');
  ul.classList.add('flex');

  const showMembers = members.slice(0, 5);

  const hiddenMembers = members.slice(5);

  console.log({ showMembers, hiddenMembers });

  showMembers.forEach((member, index) => {
    const li = document.createElement('li');
    li.classList.add('ml-[-9px]', 'relative');
    li.appendChild(renderAvatar(member, index));
    ul.appendChild(li);
  });

  container.appendChild(ul);
};

const renderAvatar = (member, index) => {
  const node = document.querySelector<HTMLTemplateElement>('#avatar-template').content.cloneNode(true);

  const name = (node as HTMLElement).querySelector('[data-id="name"]');

  name.innerHTML = nameToInitials(member.data.name);

  const statusIndicatorEl = (node as HTMLElement).querySelector('[data-id="avatar-status-indicator"]');
  const statusEl = (node as HTMLElement).querySelector('[data-id="avatar-status"]');
  const fullNameEl = (node as HTMLElement).querySelector('[data-id="avatar-full-name"]');
  const innerWrapper = (node as HTMLElement).querySelector('[data-id="avatar-inner-wrapper"]');

  fullNameEl.innerHTML = member.data.name;

  if (member.isConnected) {
    statusIndicatorEl.classList.add('text-[#11CB24]');
    statusEl.innerHTML = 'Online now';
    innerWrapper.classList.add('bg-gradient-to-b', gradients[index][0], gradients[index][1]);
    innerWrapper.classList.remove('bg-[##D0D3DC]');
  } else {
    statusIndicatorEl.classList.remove('text-[#11CB24]');
    // Sometimes timestamps come from the future
    statusEl.innerHTML = dayjs().from(dayjs(member.lastEvent.timestamp + 1000));
    innerWrapper.classList.add('bg-[#D0D3DC]');
    innerWrapper.classList.remove('bg-gradient-to-b', gradients[index][0], gradients[index][1]);
  }

  return node;
};

const renderSelfAvatar = (name) => {
  const container = document.querySelector('#avatar-self');
  container.innerHTML = '';

  const node = document.querySelector<HTMLTemplateElement>('#avatar-self-template').content.cloneNode(true);

  const nameEl = (node as HTMLElement).querySelector('[data-id="name"]');
  nameEl.innerHTML = nameToInitials(name);

  container.appendChild(node);
};

const renderAvatarOverflow = (count) => {
  if (count < 1) return;

  const container = document.querySelector('#avatar-overflow');
  container.innerHTML = '';
  const node = document.querySelector<HTMLTemplateElement>('#avatar-overflow-template').content.cloneNode(true);

  const countEl = (node as HTMLElement).querySelector('[data-id="count"]');

  countEl.innerHTML = count;

  container.appendChild(node);
};

const MAX_SHOWN_MEMBERS = 5;

const renderAvatars = (members) => {
  const showMembers = members.slice(0, MAX_SHOWN_MEMBERS);
  const hiddenMembers = members.slice(MAX_SHOWN_MEMBERS);

  renderAvatarStack(showMembers);
  renderAvatarOverflow(hiddenMembers.length);
};

(async () => {
  const clientId = nanoid();
  const ably = new Ably.Realtime.Promise({ authUrl: `/api/ably-token-request?clientId=${clientId}`, clientId });

  const spaces = new Spaces(ably);
  const space = spaces.get(getSpaceName());

  const name = getRandomName();
  const initialMembers = await space.enter({ name });

  space.on('membersUpdate', (members) => {
    renderAvatars(members);
  });

  renderSelfAvatar(name);
  renderAvatars(initialMembers);
})();
