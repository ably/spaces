import { SpaceMember } from '@ably-labs/spaces';

export const findActiveMember = (id: string, slide: string, members?: SpaceMember[]) => {
  if (!members) return;
  return members.find((member) => member.location?.element === id && member.location?.slide === slide);
};

export const getMemberFirstName = (member?: SpaceMember) => {
  if (!member) return '';
  return member.profileData.name.split(' ')[0];
};

export const getOutlineClasses = (member?: SpaceMember) => {
  if (!member) return '';
  const { color } = member.profileData;
  const { name } = color;
  const { intensity } = color.gradientStart;
  return `outline-${name}-${intensity} before:bg-${name}-${intensity}`;
};
