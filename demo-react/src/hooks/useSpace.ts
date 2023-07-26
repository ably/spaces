import { useEffect, useState } from 'react';
import { Space } from '@ably-labs/spaces';

import { getSpaceNameFromUrl } from '../utils/url';
import { spaces } from '../utils/spaces';
import { getRandomName } from '../utils/fake-names';
import { AvatarProps } from '../components';

export const useSpace = () => {
  const [space, setSpace] = useState<Space | null>(null);
  const [members, setMembers] = useState<AvatarProps[]>([]);
  const [self, setSelf] = useState<AvatarProps>({ name: '' });

  useEffect(() => {
    const initSpace = async () => {
      const space = await spaces.get(getSpaceNameFromUrl(), {
        offlineTimeout: 10_000,
      });

      if (!space) return;

      const name = getRandomName();
      await space.enter({ name });
      setSpace(space);

      const { location, profileData, isConnected } = space.getSelf() || {};
      const self = { name: profileData?.name, location, isConnected };
      setSelf(self);

      await space.locations.set({ slide: 0, element: null });

      const members = space
        .getMembers()
        .filter(({ profileData }) => profileData.name !== self.name)
        .map(({ profileData, isConnected, location }) => {
          return { name: profileData.name, isConnected, location };
        });
      setMembers(members);
    };

    initSpace();
  }, []);

  useEffect(() => {
    if (!space) return;

    space.on('membersUpdate', (members) => {
      const avatarReadyMembers = members
        .filter(({ profileData }) => profileData.name !== self.name)
        .map(({ profileData, isConnected, location }) => {
          return { name: profileData.name, isConnected, location };
        });

      setMembers(avatarReadyMembers);
    });

    return () => {
      space.off('membersUpdate');
    };
  }, [space]);

  useEffect(() => {
    if (!space) return;

    space.locations.on('locationUpdate', ({ member }) => {
      console.log('locationUpdate', member);
      setMembers((members) => {
        const updatedMembers = members.map((m) => {
          if (m.name !== member.profileData.name) return m;
          return { ...m, location: member.location };
        });
        return updatedMembers;
      });
    });

    return () => {
      space.locations.off('locationUpdate');
    };
  }, [space]);

  return { self, members, space };
};
