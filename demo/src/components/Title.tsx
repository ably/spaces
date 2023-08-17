import React, { useState } from 'react';
import ContentEditable from 'react-contenteditable';
import cn from 'classnames';
import { useChannel } from '@ably-labs/react-hooks';

import { useElementSelect, useLockAndStatus, useMembers } from '../hooks';
import { findActiveMember, getMemberFirstName, getOutlineClasses } from '../utils';

interface Props extends React.HTMLAttributes<HTMLHeadingElement> {
  id: string;
  slide: string;
  variant?: 'h1' | 'h2' | 'h3';
  children: string;
}

export const Title = ({ variant = 'h1', className, id, slide, children, ...props }: Props) => {
  const { members, self } = useMembers();
  const { handleSelect } = useElementSelect(id, true);
  const activeMember = findActiveMember(id, slide, members);
  const outlineClasses = getOutlineClasses(activeMember);
  const memberName = getMemberFirstName(activeMember);
  const { label: lockingLabel, locked, lockedByYou } = useLockAndStatus(slide, id, self?.connectionId);
  const label = lockingLabel || memberName;
  const { channel } = useChannel(`[?rewind=1]title-${id}-changes`, (message) => {
    if (message.connectionId === self?.connectionId) return;
    setContent(message.data);
  });
  const [content, setContent] = useState(children);

  return (
    <div
      {...props}
      onClick={handleSelect}
    >
      <ContentEditable
        id={id}
        tagName={variant}
        disabled={!activeMember || !lockedByYou}
        data-before={label}
        html={content}
        className={cn(
          'relative cursor-pointer',
          {
            'font-semibold text-ably-avatar-stack-demo-slide-text my-2 xs:text-3xl md:text-4xl': variant === 'h1',
            'font-semibold text-ably-avatar-stack-demo-slide-text md:text-2xl': variant === 'h2',
            'font-medium uppercase text-ably-avatar-stack-demo-slide-title-highlight xs:text-xs xs:my-4 md:my-0 md:text-md':
              variant === 'h3',
            [`outline-2 outline before:content-[attr(data-before)] before:absolute before:-top-[22px] before:-left-[2px] before:px-[10px] before:text-sm before:text-white before:rounded-t-lg before:normal-case ${outlineClasses}`]:
              !!activeMember,
            'cursor-not-allowed': locked && !lockedByYou && !!activeMember,
            'bg-slate-200': locked && !lockedByYou && !!activeMember,
          },
          className,
        )}
        onChange={(evt) => {
          const nextValue = evt.target.value;
          setContent(nextValue);
          channel.publish('update', nextValue);
        }}
      />
    </div>
  );
};
