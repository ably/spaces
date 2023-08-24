import React, { useRef } from 'react';
import cn from 'classnames';
import { useChannel } from '@ably-labs/react-hooks';

import { useClearOnFailedLock, useClickOutside, useElementSelect, useLockStatus, useMembers } from '../hooks';
import { findActiveMember, getMemberFirstName, getOutlineClasses, getSpaceNameFromUrl } from '../utils';
import { LockFilledSvg } from './svg/LockedFilled.tsx';
import { StickyLabel } from './StickyLabel.tsx';
import { EditableText } from './EditableText.tsx';
import { buildLockId } from '../utils/locking.ts';
import { useSlideElementContent } from '../hooks/useSlideElementContent.ts';
import { useMiniature } from './MiniatureContext.tsx';

interface Props extends React.HTMLAttributes<HTMLHeadingElement> {
  id: string;
  slide: string;
  variant?: 'h1' | 'h2' | 'h3';
  children: string;
  maxlength?: number;
}

export const Title = ({ variant = 'h1', className, id, slide, children, maxlength = 70, ...props }: Props) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const spaceName = getSpaceNameFromUrl();
  const { members, self } = useMembers();
  const { handleSelect } = useElementSelect(id);
  const activeMember = findActiveMember(id, slide, members);
  const { outlineClasses, stickyLabelClasses } = getOutlineClasses(activeMember);
  const { locked, lockedByYou } = useLockStatus(slide, id, self?.connectionId);
  const memberName = getMemberFirstName(activeMember);
  const lockId = buildLockId(slide, id);
  const channelName = `[?rewind=1]${spaceName}${lockId}`;
  const [content, setContent] = useSlideElementContent(lockId, children);
  const miniature = useMiniature();

  const { channel } = useChannel(channelName, (message) => {
    if (message.connectionId === self?.connectionId || miniature) return;
    setContent(message.data);
  });

  const optimisticallyLocked = !!activeMember;
  const optimisticallyLockedByYou = optimisticallyLocked && activeMember?.connectionId === self?.connectionId;
  const editIsNotAllowed = !optimisticallyLockedByYou && optimisticallyLocked;
  const lockConflict = optimisticallyLockedByYou && locked && !lockedByYou && !miniature;

  useClickOutside(ref, self, optimisticallyLockedByYou && !miniature);
  useClearOnFailedLock(lockConflict, self);

  return (
    <div
      ref={ref}
      {...props}
      className="relative"
      onClick={optimisticallyLocked ? undefined : handleSelect}
    >
      <StickyLabel
        visible={!!activeMember}
        className={`${stickyLabelClasses} flex flex-row items-center`}
      >
        {optimisticallyLockedByYou ? 'You' : memberName}
        {editIsNotAllowed && <LockFilledSvg className="text-white" />}
      </StickyLabel>
      <EditableText
        id={id}
        as={variant}
        disabled={!optimisticallyLockedByYou}
        maxlength={maxlength}
        value={content}
        onChange={(nextValue) => {
          setContent(nextValue);
          channel.publish('update', nextValue);
        }}
        className={cn(
          'relative break-all',
          {
            'font-semibold text-ably-avatar-stack-demo-slide-text my-2 xs:text-3xl md:text-4xl': variant === 'h1',
            'font-semibold text-ably-avatar-stack-demo-slide-text md:text-2xl': variant === 'h2',
            'font-medium uppercase text-ably-avatar-stack-demo-slide-title-highlight xs:text-xs xs:my-4 md:my-0 md:text-md':
              variant === 'h3',
            [`outline-2 outline ${outlineClasses}`]: optimisticallyLocked,
            'cursor-pointer': !optimisticallyLocked,
            'cursor-not-allowed': editIsNotAllowed,
            'bg-slate-200': editIsNotAllowed,
          },
          className,
        )}
      />
    </div>
  );
};
