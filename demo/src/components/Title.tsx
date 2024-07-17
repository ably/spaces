import React, { useRef } from 'react';
import cn from 'classnames';
import { ChannelProvider } from 'ably/react';

import { generateSpaceName, getMemberFirstName, getOutlineClasses, getParamValueFromUrl } from '../utils';
import { LockFilledSvg } from './svg/LockedFilled.tsx';
import { StickyLabel } from './StickyLabel.tsx';
import { EditableText } from './EditableText.tsx';
import { useTextComponentLock } from '../hooks/useTextComponentLock.ts';
import { buildLockId } from '../utils/locking.ts';

interface Props extends React.HTMLAttributes<HTMLHeadingElement> {
  id: string;
  slide: string;
  variant?: 'h1' | 'h2' | 'h3';
  children: string;
  maxlength?: number;
}

export const Title = (props: Props) => {
  const spaceName = getParamValueFromUrl('space', generateSpaceName);
  const lockId = buildLockId(props.slide, props.id);
  const channelName = `${spaceName}${lockId}`;

  return (
    <ChannelProvider
      channelName={channelName}
      options={{ params: { rewind: '1' } }}
    >
      <TitleChild
        {...props}
        channelName={channelName}
      ></TitleChild>
    </ChannelProvider>
  );
};

const TitleChild = ({
  variant = 'h1',
  className,
  id,
  slide,
  children,
  maxlength = 70,
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
        visible={!!activeMember}
        className={`${stickyLabelClasses} flex flex-row items-center`}
      >
        {lockedByYou ? 'You' : memberName}
        {editIsNotAllowed && <LockFilledSvg className="text-white" />}
      </StickyLabel>
      <EditableText
        id={id}
        as={variant}
        disabled={!lockedByYou}
        maxlength={maxlength}
        value={content}
        onChange={handleContentUpdate}
        className={cn(
          'relative break-all',
          {
            'font-semibold text-ably-avatar-stack-demo-slide-text my-2 xs:text-3xl md:text-4xl': variant === 'h1',
            'font-semibold text-ably-avatar-stack-demo-slide-text md:text-2xl': variant === 'h2',
            'font-medium uppercase text-ably-avatar-stack-demo-slide-title-highlight xs:text-xs xs:my-4 md:my-0 md:text-md':
              variant === 'h3',
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
