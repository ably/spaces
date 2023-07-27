import { useEffect, useState } from 'react';
import { Space, SpaceMember } from '@ably-labs/spaces';

import { getSpaceNameFromUrl } from '../utils/url';
import { spaces } from '../utils/spaces';
import { getRandomName } from '../utils/fake-names';

export const useSpace = () => {
  const [space, setSpace] = useState<Space | undefined>(undefined);
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [self, setSelf] = useState<SpaceMember | undefined>(undefined);

  useEffect(() => {
    const initSpace = async () => {
      const space = await spaces.get(getSpaceNameFromUrl(), {
        offlineTimeout: 10_000,
      });

      if (!space) return;

      setSpace(space);

      const name = getRandomName();
      await space.enter({ name });
      await space.locations.set({ slide: 0, element: null });

      const self = space.getSelf();
      setSelf(self);
      const members = takeOutSelf(space.getMembers(), self);
      setMembers(members);
    };

    initSpace();
  }, []);

  useEffect(() => {
    if (!space) return;

    space.subscribe('membersUpdate', (members) => {
      console.log('membersUpdate', members);
      const membersWithoutSelf = takeOutSelf(members, self);
      setMembers(membersWithoutSelf);
    });

    return () => {
      space.unsubscribe('membersUpdate');
    };
  }, [space]);

  useEffect(() => {
    if (!space) return;

    space.locations.subscribe('locationUpdate', ({ member }) => {
      if (member.clientId === self?.clientId) {
        setSelf(member);
        return;
      }

      const updatedMembers = members.map((m) => {
        if (m.clientId === member.clientId) {
          return member;
        }
        return m;
      });
      setMembers(updatedMembers);
    });

    return () => {
      space.locations.unsubscribe('locationUpdate');
    };
  }, [space]);

  return { self, members, space };
};

const takeOutSelf = (members: SpaceMember[], self: SpaceMember | undefined) => {
  if (!self) return members;

  return members.filter((member) => member.profileData.name !== self.profileData.name);
};
