import { useEffect, useState, useContext } from 'react';
import { type SpaceMember } from '@ably/spaces';
import { SpacesContext } from '../components';

import { type Member } from '../utils/types';

export const isMember = (obj: unknown): obj is Member => {
  return !!(obj as Member)?.profileData?.name && !!(obj as Member)?.profileData?.color;
};

const areMembers = (arr: unknown): arr is Member[] => {
  return (arr as Member[]).every((m) => isMember(m));
};

const membersToOthers = (members: Member[] = [], self: SpaceMember | null): Member[] =>
  members.filter((m) => m.connectionId !== self?.connectionId);

export const useMembers: () => { self?: Member; others: Member[]; members: Member[] } = () => {
  const space = useContext(SpacesContext);
  const [members, setMembers] = useState<Member[]>([]);
  const [others, setOthers] = useState<Member[]>([]);
  const [self, setSelf] = useState<Member | undefined>(undefined);

  useEffect(() => {
    if (!space) return;

    const handler = ({ members }: { members: SpaceMember[] }) =>
      (async () => {
        const self = await space.members.getSelf();

        if (isMember(self)) {
          setSelf(self);
        }

        if (areMembers(members)) {
          setMembers([...members]);
          setOthers(membersToOthers([...members], self));
        }
      })();

    const init = async () => {
      const initSelf = await space.members.getSelf();
      const initMembers = await space.members.getAll();

      if (isMember(initSelf)) {
        setSelf(initSelf);
      }

      if (areMembers(initMembers)) {
        setMembers(initMembers);
        setOthers(membersToOthers(initMembers, initSelf));
      }
      space.subscribe('update', handler);
    };

    init();

    return () => {
      space.unsubscribe('update', handler);
    };
  }, [space]);

  return { members, self, others };
};
