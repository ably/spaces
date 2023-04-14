import { LocationChange } from '../../../src/Locations';
import Space from '../../../src/Space';
import { colors } from '../utils/colors';

export const locationChangeHandlers = (htmlElement: HTMLElement, selectedClasses: string[], space: Space) => ({
  selectLocation: (change: LocationChange<string>) => {
    const self = space.getSelf();

    htmlElement.setAttribute(`data-client-${change.member.clientId}`, 'true');

    if (change.member.clientId === self.clientId) {
      htmlElement.classList.add(...selectedClasses, 'outline-blue-400');
      return;
    }

    const members = space.getMembers();
    console.log(members);
    const memberIndex = members
      .filter((member) => member.clientId !== self.clientId)
      .findIndex((member) => member.clientId === change.member.clientId);
    const color = colors[memberIndex % colors.length];
    const outlineColor = `outline-${color[0]}-${color[1]}`;
    htmlElement.classList.add(...selectedClasses, outlineColor);
  },
  deselectLocation: (change: LocationChange<string>) => {
    const self = space.getSelf();

    htmlElement.removeAttribute(`data-client-${change.member.clientId}`);

    const classesToRemove =
      htmlElement.getAttributeNames().filter((name) => name.startsWith('data-client-')).length > 0
        ? []
        : selectedClasses;

    if (change.member.clientId === self.clientId) {
      htmlElement.classList.remove(...classesToRemove, 'outline-blue-400');
      return;
    }
    const members = space.getMembers();
    const memberIndex = members
      .filter((member) => member.clientId !== self.clientId)
      .findIndex((member) => member.clientId === change.member.clientId);
    const color = colors[memberIndex % colors.length];
    const outlineColor = `outline-${color[0]}-${color[1]}`;

    htmlElement.classList.remove(...classesToRemove, outlineColor);
  },
});
