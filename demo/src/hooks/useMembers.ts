import { useEffect, useState, useContext } from 'react';
import { type SpaceMember } from '../../../src/types';
import { SpacesContext } from '../components';

import { type Member } from '../utils/types';

const isMember = (obj: unknown): obj is Member => {
  return !!(obj as Member)?.profileData?.name && !!(obj as Member)?.profileData?.color;
};

const areMembers = (arr: unknown): arr is Member[] => {
  return (arr as Member[]).every((m) => isMember(m));
};

const membersToOthers = (members: Member[] = [], self: SpaceMember | undefined): Member[] =>
  members.filter((m) => m.connectionId !== self?.connectionId);

export const useMembers: () => Partial<{ self?: Member; others: Member[]; members: Member[] }> = () => {
  const space = useContext(SpacesContext);
  const [members, setMembers] = useState<Member[]>([]);
  const [others, setOthers] = useState<Member[]>([]);
  const [self, setSelf] = useState<Member | undefined>(undefined);

  useEffect(() => {
    if (!space) return;

    const initSelf = space.members.getSelf();
    const initMembers = space.members.getAll();

    if (isMember(initSelf)) {
      setSelf(initSelf);
    }

    if (areMembers(initMembers)) {
      setMembers(initMembers);
      setOthers(membersToOthers(initMembers, initSelf));
    }

    const handler = ({ members }: { members: SpaceMember[] }) => {
      const self = space.members.getSelf();

      if (isMember(self)) {
        setSelf(self);
      }

      if (areMembers(members)) {
        setMembers([...members]);
        setOthers(membersToOthers([...members], self));
      }
    };

    space.subscribe('update', handler);

    return () => {
      space.unsubscribe('update', handler);
    };
  }, [space]);

  return { members, self, others };
};
