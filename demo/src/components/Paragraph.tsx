import React, { useRef } from 'react';
import cn from 'classnames';
import { ChannelProvider } from 'ably/react';

import { generateSpaceName, getMemberFirstName, getOutlineClasses, getParamValueFromUrl } from '../utils';
import { StickyLabel } from './StickyLabel';
import { LockFilledSvg } from './svg/LockedFilled.tsx';
import { EditableText } from './EditableText.tsx';
import { useTextComponentLock } from '../hooks/useTextComponentLock.ts';
import { buildLockId } from '../utils/locking.ts';

interface Props extends React.HTMLAttributes<HTMLParagraphElement> {
  id: string;
  slide: string;
  variant?: 'regular' | 'aside';
  children: string;
  maxlength?: number;
}

export const Paragraph = (props: Props) => {
  const spaceName = getParamValueFromUrl('space', generateSpaceName);
  const lockId = buildLockId(props.slide, props.id);
  const channelName = `${spaceName}${lockId}`;

  return (
    <ChannelProvider
      channelName={channelName}
      options={{ params: { rewind: '1' } }}
    >
      <ParagraphChild
        {...props}
        channelName={channelName}
      ></ParagraphChild>
    </ChannelProvider>
  );
};

const ParagraphChild = ({
  variant = 'regular',
  id,
  slide,
  className,
  children,
  maxlength = 300,
  channelName,
  ...props
}: Props & { channelName: string }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { content, activeMember, locked, lockedByYou, editIsNotAllowed, handleSelect, handleContentUpdate } =
    useTextComponentLock({
      channelName,
      id,
      slide,
      defaultText: children,
      containerRef,
    });
  const memberName = getMemberFirstName(activeMember);
  const { outlineClasses, stickyLabelClasses } = getOutlineClasses(activeMember);

  return (
    <div
      ref={containerRef}
      {...props}
      className="relative"
      onClick={locked ? undefined : handleSelect}
    >
      <StickyLabel
        visible={locked}
        className={`${stickyLabelClasses} flex flex-row items-center`}
      >
        {lockedByYou ? 'You' : memberName}
        {editIsNotAllowed && <LockFilledSvg className="text-white" />}
      </StickyLabel>
      <EditableText
        as="p"
        id={id}
        disabled={!lockedByYou}
        value={content}
        onChange={handleContentUpdate}
        maxlength={maxlength}
        className={cn(
          'text-ably-avatar-stack-demo-slide-text break-all',
          {
            'xs:w-auto text-xs xs:text-base md:text-lg xs:my-4 md:my-0': variant === 'regular',
            'text-[13px] p-0 leading-6': variant === 'aside',
            [`outline-2 outline ${outlineClasses}`]: locked,
            'cursor-pointer': !locked,
            'cursor-not-allowed': editIsNotAllowed,
            'bg-slate-200': editIsNotAllowed,
          },
          className,
        )}
      />
    </div>
  );
};
