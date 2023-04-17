import { LocationChange } from '../../../src/Locations';
import Space from '../../../src/Space';
import { colors } from '../utils/colors';

const getShortName = (name?: string) => (name ? name.split(/\s/)[0] : '');

export const locationChangeHandlers = (htmlElement: HTMLElement, selectedClasses: string[], space: Space) => ({
  selectLocation: (change: LocationChange<string>) => {
    const self = space.getSelf();

    const shortName = getShortName(change.member.profileData.name);

    htmlElement.setAttribute(`data-client-${change.member.clientId}`, 'true');

    const allPresent = htmlElement.getAttribute('data-all-present');
    htmlElement.setAttribute('data-all-present', `${allPresent ? `${allPresent} ` : ''}${shortName}`);

    if (!htmlElement.getAttribute('data-before')) {
      htmlElement.setAttribute('data-before', shortName);
    }

    if (change.member.clientId === self.clientId) {
      htmlElement.classList.add(...selectedClasses, 'outline-blue-400', 'before:bg-blue-400');
      return;
    }

    const members = space.getMembers();

    const memberIndex = members
      .filter((member) => member.clientId !== self.clientId)
      .findIndex((member) => member.clientId === change.member.clientId);
    const color = colors[memberIndex % colors.length];
    const cssColor = `${color[0]}-${color[1]}`;
    const outlineColor = `outline-${cssColor}`;
    htmlElement.classList.add(...selectedClasses, outlineColor, `before:bg-${cssColor}`);
  },
  deselectLocation: (change: LocationChange<string>) => {
    const self = space.getSelf();

    const shortName = getShortName(change.member.profileData.name);

    htmlElement.removeAttribute(`data-client-${change.member.clientId}`);

    htmlElement.removeAttribute('data-before');

    const allPresent = htmlElement.getAttribute('data-all-present');
    const allPresentList = allPresent ? allPresent.split(/\s/) : [];
    if (allPresentList.length <= 1) {
      htmlElement.removeAttribute('data-all-present');
    } else {
      const filteredAllPresent = allPresentList.filter((name) => name !== shortName);
      htmlElement.setAttribute('data-before', filteredAllPresent[filteredAllPresent.length - 1]);
      htmlElement.setAttribute('data-all-present', filteredAllPresent.join(' '));
    }

    const classesToRemove =
      htmlElement.getAttributeNames().filter((name) => name.startsWith('data-client-')).length > 0
        ? []
        : selectedClasses;

    if (change.member.clientId === self.clientId) {
      htmlElement.classList.remove(...classesToRemove, 'outline-blue-400', 'before:bg-blue-400');
      return;
    }
    const members = space.getMembers();
    const memberIndex = members
      .filter((member) => member.clientId !== self.clientId)
      .findIndex((member) => member.clientId === change.member.clientId);
    const color = colors[memberIndex % colors.length];
    const cssColor = `${color[0]}-${color[1]}`;
    const outlineColor = `outline-${cssColor}`;

    htmlElement.classList.remove(...classesToRemove, outlineColor, `before:bg-${cssColor}`);
  },
});
