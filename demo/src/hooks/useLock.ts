import { useContext, useEffect, useState } from 'react';

import { type Lock } from '@ably-labs/spaces';

import { SpacesContext } from '../components';
import { buildLockId } from '../utils/locking';
import { isMember } from '../hooks';

import { getMemberFirstName } from '../utils';

import { type Member } from '../utils/types';

export const useLock = (slide: string, id: string): { status?: string; member?: Member } => {
  const space = useContext(SpacesContext);
  const locationLockId = buildLockId(slide, id);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [member, setMember] = useState<Member | undefined>(undefined);

  useEffect(() => {
    if (!space) return;

    const handler = (lock: Lock) => {
      if (lock.request.id !== locationLockId) return;

      setStatus(lock.request.status);

      if (isMember(lock.member)) {
        setMember(lock.member);
      }
    };

    space.locks.subscribe('update', handler);

    return () => {
      space?.locks.unsubscribe('update', handler);
    };
  }, [space, slide, id]);

  return { status, member };
};

export const useLockLabelCallback = (slide: string, id: string, selfConnectionId?: string) => {
  const { member, status } = useLock(slide, id);
  const [label, setLabel] = useState<string | undefined>(undefined);

  useEffect(() => {
    // We're locking this component
    if (status === 'locked' && member?.connectionId === selfConnectionId) {
      setLabel(`Locked by You`);
    } else if (status === 'locked') {
      setLabel(`Locked by ${getMemberFirstName(member)}`);
    } else if (status === 'unlocked') {
      setLabel(undefined);
    }
  }, [member, status, slide, id, selfConnectionId]);

  return label;
};

export const useLockAndStatus = (slide: string, id: string, selfConnectionId?: string) => {
  const { member, status } = useLock(slide, id);
  const [label, setLabel] = useState<string | undefined>(undefined);

  const lockedByYou = status === 'locked' && member?.connectionId === selfConnectionId;

  useEffect(() => {
    // We're locking this component
    if (lockedByYou) {
      setLabel(`Locked by You`);
    } else if (status === 'locked') {
      setLabel(`Locked by ${getMemberFirstName(member)}`);
    } else if (status === 'unlocked') {
      setLabel(undefined);
    }
  }, [member, status, slide, id, selfConnectionId]);

  return { label, lockedByYou };
};
