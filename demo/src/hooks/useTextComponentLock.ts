import { MutableRefObject, useCallback } from 'react';
import { useChannel } from 'ably/react';
import { useMembers, useLock } from '@ably/spaces/react';
import sanitize from 'sanitize-html';
import { findActiveMember, generateSpaceName, getParamValueFromUrl } from '../utils';
import { buildLockId } from '../utils/locking.ts';
import { usePreview } from '../components/PreviewContext.tsx';
import { useClearOnFailedLock, useClickOutside, useElementSelect } from './useElementSelect.ts';
import { useSlideElementContent } from './useSlideElementContent.ts';

interface UseTextComponentLockArgs {
  id: string;
  slide: string;
  defaultText: string;
  containerRef: MutableRefObject<HTMLElement | null>;
}

export const useTextComponentLock = ({ id, slide, defaultText, containerRef }: UseTextComponentLockArgs) => {
  const spaceName = getParamValueFromUrl('space', generateSpaceName);
  const { members, self } = useMembers();
  const activeMember = findActiveMember(id, slide, members);
  const lockId = buildLockId(slide, id);
  const { status, member } = useLock(lockId);
  const locked = status === 'locked';
  const lockedByYou = locked && self?.connectionId === member?.connectionId;
  const channelName = `[?rewind=1]${spaceName}${lockId}`;
  const [content, updateContent] = useSlideElementContent(lockId, defaultText);
  const preview = usePreview();

  const { handleSelect } = useElementSelect(id);
  const handleContentUpdate = useCallback((content: string) => {
    updateContent(content);
    channel.publish('update', content);
  }, []);

  const { channel } = useChannel(channelName, (message) => {
    if (message.connectionId === self?.connectionId) return;
    const sanitizedValue = sanitize(message.data, { allowedTags: [] });
    updateContent(sanitizedValue);
  });

  const optimisticallyLocked = !!activeMember;
  const optimisticallyLockedByYou = optimisticallyLocked && activeMember?.connectionId === self?.connectionId;
  const editIsNotAllowed = !optimisticallyLockedByYou && optimisticallyLocked;
  const lockConflict = optimisticallyLockedByYou && locked && !lockedByYou && !preview;

  useClickOutside(containerRef, self, optimisticallyLockedByYou && !preview);
  useClearOnFailedLock(lockConflict, self);

  return {
    content,
    activeMember,
    locked: optimisticallyLocked,
    lockedByYou: optimisticallyLockedByYou,
    editIsNotAllowed,
    handleSelect,
    handleContentUpdate,
  };
};
