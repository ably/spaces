import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { gradients } from '../utils/gradients';
import { queryDataId, createFragment } from '../utils/dom';
import { nameToInitials } from '../utils/fake-names';

dayjs.extend(relativeTime);

const updateStatusTime = (statusEl: Element, timestamp: number) =>
  (statusEl.innerHTML = `Left ${dayjs().to(timestamp)}`);

const changeStatusIndicator = (fragment, isConnected, lastEvent) => {
  const statusIndicatorEl = queryDataId(fragment, 'avatar-status-indicator');
  const statusEl = queryDataId(fragment, 'avatar-status');

  if (isConnected) {
    statusIndicatorEl.classList.remove('text-slate-500');
    statusIndicatorEl.classList.add('text-[#11CB24]');
    statusEl.innerHTML = 'Online now';
  } else {
    statusIndicatorEl.classList.remove('text-[#11CB24]');
    statusIndicatorEl.classList.add('text-slate-500');
    updateStatusTime(statusEl, lastEvent.timestamp);
  }
};

const renderAvatarStack = (members) => {
  const container = document.querySelector('#avatar-stack');
  container.innerHTML = '';

  const ul = document.createElement('ul');
  ul.classList.add('flex');

  const showMembers = members.slice(0, 5);

  showMembers.forEach((member, index) => {
    const avatar = renderAvatar(member, index);
    if (avatar) {
      const li = document.createElement('li');
      li.classList.add('ml-[-9px]', 'relative');
      li.appendChild(avatar);
      ul.appendChild(li);
    }
  });

  container.appendChild(ul);
};

const renderAvatar = (member, index) => {
  const fragment = createFragment('#avatar-template');

  const memberName = member.profileData?.name;

  if (!memberName) {
    return;
  }

  const initials = queryDataId(fragment, 'name');
  initials.innerHTML = nameToInitials(member.profileData.name);
  const fullNameEl = queryDataId(fragment, 'avatar-full-name');
  fullNameEl.innerHTML = member.profileData.name;

  const innerWrapper = queryDataId(fragment, 'avatar-inner-wrapper');

  const statusElement = queryDataId(fragment, 'avatar-status');

  const updateStatusElementWithTime = () => {
    updateStatusTime(statusElement, member.lastEvent.timestamp);
  };
  if (member.isConnected) {
    innerWrapper.classList.add('bg-gradient-to-b', gradients[index][0], gradients[index][1]);
    innerWrapper.classList.remove('bg-[##D0D3DC]');
    innerWrapper.removeEventListener('mouseover', updateStatusElementWithTime);
  } else {
    innerWrapper.classList.add('bg-[#D0D3DC]');
    innerWrapper.classList.remove('bg-gradient-to-b', gradients[index][0], gradients[index][1]);
    innerWrapper.addEventListener('mouseover', updateStatusElementWithTime);
  }

  changeStatusIndicator(fragment, member.isConnected, member.lastEvent);

  return fragment;
};

const renderSelfAvatar = (name) => {
  const container = document.querySelector('#avatar-self');
  container.innerHTML = '';
  const fragment = createFragment('#avatar-self-template');
  const initials = queryDataId(fragment, 'name');
  initials.innerHTML = nameToInitials(name);
  const fullNameEl = queryDataId(fragment, 'avatar-full-name');
  fullNameEl.innerHTML = name + ' (You)';
  container.appendChild(fragment);
};

const renderAvatarOverflow = (members) => {
  const count = members.length;

  if (count < 1) return [];

  const container = document.querySelector('#avatar-overflow');
  container.innerHTML = '';

  const fragment = createFragment('#avatar-overflow-template');

  const countEl = queryDataId(fragment, 'count');
  countEl.innerHTML = count;

  const avatarHover = queryDataId(fragment, 'avatar-hover');

  members.forEach((member) => {
    const fragmentMember = createFragment('#avatar-hover');
    const fullNameEl = queryDataId(fragmentMember, 'avatar-full-name');
    fullNameEl.innerHTML = member.profileData.name;
    changeStatusIndicator(fragmentMember, member.isConnected, member.lastEvent);
    avatarHover.appendChild(fragmentMember);
  });

  container.appendChild(fragment);
};

const MAX_SHOWN_MEMBERS = 5;

const renderAvatars = (members) => {
  const showMembers = members.slice(0, MAX_SHOWN_MEMBERS);
  const hiddenMembers = members.slice(MAX_SHOWN_MEMBERS);
  renderAvatarStack(showMembers);
  renderAvatarOverflow(hiddenMembers);
};

export { renderAvatars, renderSelfAvatar };
