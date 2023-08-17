import cn from 'classnames';
import { useElementSelect, useMembers, useLockAndStatus } from '../hooks';
import { findActiveMember, getMemberFirstName, getOutlineClasses } from '../utils';
import { useChannel } from '@ably-labs/react-hooks';
import { useState } from 'react';
import ContentEditable from 'react-contenteditable';

interface Props extends React.HTMLAttributes<HTMLParagraphElement> {
  id: string;
  slide: string;
  variant?: 'regular' | 'aside';
  children: string;
}

export const Paragraph = ({ variant = 'regular', id, slide, className, children, ...props }: Props) => {
  const { members, self } = useMembers();
  const { handleSelect } = useElementSelect(id);
  const activeMember = findActiveMember(id, slide, members);
  const outlineClasses = getOutlineClasses(activeMember);
  const { label: lockingLabel, locked, lockedByYou } = useLockAndStatus(slide, id, self?.connectionId);
  const memberName = getMemberFirstName(activeMember);
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
        tag="p"
        id={id}
        data-before={label}
        disabled={!activeMember || !lockedByYou}
        html={content}
        onChange={(evt) => {
          const nextValue = evt.target.value;
          setContent(nextValue);
          channel.publish('update', nextValue);
        }}
        className={cn(
          'text-ably-avatar-stack-demo-slide-text cursor-pointer relative',
          {
            'xs:w-auto text-xs xs:text-base md:text-lg xs:my-4 md:my-0': variant === 'regular',
            'text-[13px] p-0 leading-6': variant === 'aside',
            [`outline-2 outline before:content-[attr(data-before)] before:absolute before:-top-[22px] before:-left-[2px] before:px-[10px] before:text-sm before:text-white before:rounded-t-lg before:normal-case ${outlineClasses}`]:
              !!activeMember,
            'cursor-not-allowed': locked && !lockedByYou && !!activeMember,
            'bg-slate-200': locked && !lockedByYou && !!activeMember,
          },
          className,
        )}
      />
    </div>
  );
};
