import React, { useRef } from 'react';
import cn from 'classnames';
import { getMemberFirstName, getOutlineClasses } from '../utils';
import { StickyLabel } from './StickyLabel';
import { LockFilledSvg } from './svg/LockedFilled.tsx';
import { EditableText } from './EditableText.tsx';
import { useTextComponentLock } from '../hooks/useTextComponentLock.ts';

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { content, activeMember, locked, lockedByYou, editIsNotAllowed, handleSelect, handleContentUpdate } =
    useTextComponentLock({
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
