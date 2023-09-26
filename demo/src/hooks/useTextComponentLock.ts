import { MutableRefObject, useCallback } from 'react';
import { useChannel } from '@ably-labs/react-hooks';
import { findActiveMember, generateSpaceName, getParamValueFromUrl } from '../utils';
import { buildLockId } from '../utils/locking.ts';
import { usePreview } from '../components/PreviewContext.tsx';
import { useMembers } from './useMembers.ts';
import { useClearOnFailedLock, useClickOutside, useElementSelect } from './useElementSelect.ts';
import { useLockStatus } from './useLock.ts';
import { useSlideElementContent } from './useSlideElementContent.ts';
import sanitize from 'sanitize-html';

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
  const { locked, lockedByYou } = useLockStatus(slide, id, self?.connectionId);
  const lockId = buildLockId(slide, id);
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
