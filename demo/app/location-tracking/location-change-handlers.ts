import { LocationChange } from '../../../src/Locations';
import Space, { SpaceMember } from '../../../src/Space';
import { deselectTextElement, selectTextElement } from './track-text-elements';

const getShortName = (name?: string) => (name ? name.split(/\s/)[0] : '');

export const locationChangeHandlers = (htmlElement: HTMLElement, space: Space) => ({
  selectLocation: (change: LocationChange<string>) => {
    const self = space.getSelf();

    const shortName = getShortName(change.member.profileData.name);

    const members = space.getMembers();

    const memberIndex = members
      .filter((member: SpaceMember) => member.clientId !== self.clientId)
      .findIndex((member: SpaceMember) => member.clientId === change.member.clientId);

    selectTextElement(htmlElement, shortName, change.member.clientId, self.clientId, memberIndex);
  },
  deselectLocation: (change: LocationChange<string>) => {
    const self = space.getSelf();

    const shortName = getShortName(change.member.profileData.name);

    const members = space.getMembers();

    const memberIndex = members
      .filter((member) => member.clientId !== self.clientId)
      .findIndex((member) => member.clientId === change.member.clientId);

    deselectTextElement(htmlElement, shortName, change.member.clientId, self.clientId, memberIndex);
  },
});
