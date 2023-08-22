import React, { useRef } from 'react';
import cn from 'classnames';
import { useChannel } from '@ably-labs/react-hooks';
import { useClickOutside, useElementSelect, useMembers } from '../hooks';
import { findActiveMember, getMemberFirstName, getOutlineClasses, getSpaceNameFromUrl } from '../utils';
import { StickyLabel } from './StickyLabel';
import { LockFilledSvg } from './svg/LockedFilled.tsx';
import { EditableText } from './EditableText.tsx';
import { buildLockId } from '../utils/locking.ts';
import { useSlideElementContent } from '../hooks/useSlideElementContent.ts';

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
  //const { locked, lockedByYou } = useLockStatus(slide, id, self?.connectionId);
  const locked = !!activeMember;
  const lockedByYou = activeMember?.connectionId === self?.connectionId;
  const memberName = getMemberFirstName(activeMember);
  const lockId = buildLockId(slide, id);
  const channelName = `[?rewind=1]${spaceName}${lockId}`;
  const [content, setContent] = useSlideElementContent(lockId, children);
  const { channel } = useChannel(channelName, (message) => {
    if (message.connectionId === self?.connectionId) return;
    setContent(message.data);
  });
  const editIsNotAllowed = locked && !lockedByYou && !!activeMember;

  useClickOutside(ref, self, lockedByYou);

  return (
    <div
      ref={ref}
      {...props}
      className="relative"
      onClick={editIsNotAllowed ? undefined : handleSelect}
    >
      <StickyLabel
        visible={!!activeMember}
        className={`${stickyLabelClasses} flex flex-row items-center`}
      >
        {activeMember?.connectionId === self?.connectionId ? 'You' : memberName}
        {locked && !lockedByYou && !!activeMember && <LockFilledSvg className="text-white" />}
      </StickyLabel>
      <EditableText
        as="p"
        id={id}
        disabled={!activeMember || !lockedByYou}
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
            [`outline-2 outline ${outlineClasses}`]: !!activeMember,
            'cursor-pointer': !editIsNotAllowed,
            'cursor-not-allowed': editIsNotAllowed,
            'bg-slate-200': editIsNotAllowed,
          },
          className,
        )}
      />
    </div>
  );
};
