import Space, { SpaceMember } from '../../../src/Space';
import { createFragment, queryDataId } from '../utils/dom';
import { nameToInitials } from '../utils/fake-names';
import { gradients } from '../utils/gradients';

const slideSelectedClasses = ['mb-[140px]'];

const renderPreviewAvatar = (member: SpaceMember, index: number, isSelf?: boolean) => {
  const fragment = createFragment('#avatar-template');

  const memberName = member.profileData?.name;

  if (!memberName) {
    return;
  }

  queryDataId(fragment, 'avatar-hover').remove();

  const initials = queryDataId(fragment, 'name');
  initials.innerHTML = nameToInitials(member.profileData.name);

  const innerWrapper = queryDataId(fragment, 'avatar-inner-wrapper');

  const [fromColor, toColor] = [
    isSelf ? 'from-blue-400' : gradients[index][0],
    isSelf ? 'to-blue-500' : gradients[index][1],
  ];

  if (member.isConnected) {
    innerWrapper.classList.add('bg-gradient-to-b', fromColor, toColor);
    innerWrapper.classList.remove('bg-[##D0D3DC]');
  } else {
    innerWrapper.classList.add('bg-[#D0D3DC]');
    innerWrapper.classList.remove('bg-gradient-to-b', fromColor, toColor);
  }

  return fragment;
};

const addAvatarToList = (ul: HTMLUListElement, avatar?: Node) => {
  if (avatar) {
    const li = document.createElement('li');
    li.classList.add('ml-[-9px]', 'relative');
    li.appendChild(avatar);
    ul.appendChild(li);
  }
};

const renderPreviewStack = (
  slideMembers: { member: SpaceMember; i: number }[],
  self: SpaceMember | false,
  slideId: string,
) => {
  const ul = document.createElement('ul');
  ul.classList.add('flex', 'absolute', 'scale-[3]', 'top-[800px]', 'left-[1220px]', 'translate-x-[-100%]');
  ul.setAttribute('id', `preview-stack-${slideId}`);

  if (self) {
    const avatar = renderPreviewAvatar(self, 0, true);
    addAvatarToList(ul, avatar);
  }

  slideMembers.forEach(({ member, i }) => {
    const avatar = renderPreviewAvatar(member, i);
    addAvatarToList(ul, avatar);
  });
  return ul;
};

const updatePreviewAvatarStack = (space: Space, htmlElement: HTMLElement, selfId: string, slideId: string) => {
  const members = space.getMembers();
  const slideMembers = members
    .filter((member) => member.clientId !== selfId)
    .map((member, i) => ({ member, i }))
    .filter(({ member }) => member.location && member.location.startsWith(slideId));

  const self = space.getSelf();
  const selfIsPresent = self.location && self.location.startsWith(slideId);

  if (slideMembers.length > 0 || selfIsPresent) {
    htmlElement.classList.add(...slideSelectedClasses);
  }

  const previewStack = renderPreviewStack(slideMembers, selfIsPresent && self, slideId);

  document.getElementById(`preview-stack-${slideId}`)?.remove();
  htmlElement.appendChild(previewStack);
};

const selectSlideElement =
  (space: Space, slideId: string) =>
  (htmlElement: HTMLElement, userName: string, newClientId: string, selfId: string) => {
    updatePreviewAvatarStack(space, htmlElement, selfId, slideId);
  };

const deselectSlideElement =
  (space: Space, slideId: string) =>
  (htmlElement: HTMLElement, userName: string, oldClientId: string, selfId: string) => {
    htmlElement.classList.remove(...slideSelectedClasses);
    updatePreviewAvatarStack(space, htmlElement, selfId, slideId);
  };

const createSlideElementManager = (space: Space, slideId: string) => ({
  selector: selectSlideElement(space, slideId),
  deselector: deselectSlideElement(space, slideId),
});

export { renderPreviewStack, createSlideElementManager };
