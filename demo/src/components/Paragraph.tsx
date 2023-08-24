import React, { useRef } from 'react';
import cn from 'classnames';
import { useChannel } from '@ably-labs/react-hooks';
import { useClearOnFailedLock, useClickOutside, useElementSelect, useLockStatus, useMembers } from '../hooks';
import { findActiveMember, getMemberFirstName, getOutlineClasses, getSpaceNameFromUrl } from '../utils';
import { StickyLabel } from './StickyLabel';
import { LockFilledSvg } from './svg/LockedFilled.tsx';
import { EditableText } from './EditableText.tsx';
import { buildLockId } from '../utils/locking.ts';
import { useSlideElementContent } from '../hooks/useSlideElementContent.ts';
import { useMiniature } from './MiniatureContext.tsx';

interface Props extends React.HTMLAttributes<HTMLParagraphElement> {
  id: string;
  slide: string;
  variant?: 'regular' | 'aside';
  children: string;
  maxlength?: number;
}

export const Paragraph = ({
  variant = 'regular',
  id,
  slide,
  className,
  children,
  maxlength = 300,
  ...props
}: Props) => {
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
        visible={optimisticallyLocked}
        className={`${stickyLabelClasses} flex flex-row items-center`}
      >
        {optimisticallyLockedByYou ? 'You' : memberName}
        {editIsNotAllowed && <LockFilledSvg className="text-white" />}
      </StickyLabel>
      <EditableText
        as="p"
        id={id}
        disabled={!optimisticallyLockedByYou}
        value={content}
        onChange={(nextValue) => {
          setContent(nextValue);
          channel.publish('update', nextValue);
        }}
        maxlength={maxlength}
        className={cn(
          'text-ably-avatar-stack-demo-slide-text break-all',
          {
            'xs:w-auto text-xs xs:text-base md:text-lg xs:my-4 md:my-0': variant === 'regular',
            'text-[13px] p-0 leading-6': variant === 'aside',
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
