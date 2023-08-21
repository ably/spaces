import React, { useState } from 'react';
import cn from 'classnames';
import { useChannel } from '@ably-labs/react-hooks';

import { useElementSelect, useLockStatus, useMembers } from '../hooks';
import { findActiveMember, getMemberFirstName, getOutlineClasses, getSpaceNameFromUrl } from '../utils';
import { LockFilledSvg } from './svg/LockedFilled.tsx';
import { StickyLabel } from './StickyLabel.tsx';
import { EditableText } from './EditableText.tsx';
import { buildLockId } from '../utils/locking.ts';

interface Props extends React.HTMLAttributes<HTMLHeadingElement> {
  id: string;
  slide: string;
  variant?: 'h1' | 'h2' | 'h3';
  children: string;
}

export const Title = ({ variant = 'h1', className, id, slide, children, ...props }: Props) => {
  const spaceName = getSpaceNameFromUrl();
  const { members, self } = useMembers();
  const { handleSelect } = useElementSelect(id, true);
  const activeMember = findActiveMember(id, slide, members);
  const { outlineClasses, stickyLabelClasses } = getOutlineClasses(activeMember);
  const memberName = getMemberFirstName(activeMember);
  const { locked, lockedByYou } = useLockStatus(slide, id, self?.connectionId);
  const channelName = `[?rewind=1]${spaceName}-${buildLockId(slide, id)}`;
  const { channel } = useChannel(channelName, (message) => {
    setContent(message.data);
  });
  const [content, setContent] = useState(children);
  const editIsNotAllowed = locked && !lockedByYou && !!activeMember;

  return (
    <div
      {...props}
      className="relative"
      onClick={handleSelect}
    >
      <StickyLabel
        visible={!!activeMember}
        className={`${stickyLabelClasses} flex flex-row items-center`}
      >
        {lockedByYou ? 'You' : memberName}
        {locked && !lockedByYou && !!activeMember && <LockFilledSvg className="text-white" />}
      </StickyLabel>
      <EditableText
        id={id}
        as={variant}
        disabled={!activeMember || !lockedByYou}
        maxChars={70}
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
