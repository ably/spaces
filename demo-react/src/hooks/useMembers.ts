import { useEffect, useState, useContext } from 'react';
import { type SpaceMember } from '@ably-labs/spaces';
import { SpacesContext } from '../components';

const membersToOthers = (members: SpaceMember[] = [], self: SpaceMember | undefined): SpaceMember[] =>
  members.filter((m) => m.connectionId !== self?.connectionId);

export const useMembers: () => Partial<{ self: SpaceMember; others: SpaceMember[]; members: SpaceMember[] }> = () => {
  const space = useContext(SpacesContext);
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [others, setOthers] = useState<SpaceMember[]>([]);
  const [self, setSelf] = useState<SpaceMember | undefined>(undefined);

  useEffect(() => {
    if (!space) return;

    const initSelf = space.getSelf();
    const initMembers = space.getMembers();

    setSelf(initSelf);
    setMembers(initMembers);
    setOthers(membersToOthers(initMembers, initSelf));

    const handler = (members: SpaceMember[]) => {
      const self = space.getSelf();
      setSelf(self);
      setMembers([...members]);
      setOthers((members ?? []).filter((m) => m.connectionId !== self?.connectionId));
    };

    space.subscribe('membersUpdate', handler);

    return () => {
      space.unsubscribe('membersUpdate', handler);
    };
  }, [space]);

  return { members, self, others };
};
