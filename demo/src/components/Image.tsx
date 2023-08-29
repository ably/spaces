import cn from 'classnames';
import { useClickOutside, useElementSelect, useMembers } from '../hooks';
import { findActiveMembers, getMemberFirstName, getOutlineClasses } from '../utils';
import { useRef } from 'react';
import { usePreview } from './PreviewContext.tsx';

interface Props extends React.HTMLAttributes<HTMLImageElement> {
  src: string;
  children?: React.ReactNode;
  className?: string;
  id: string;
  slide: string;
  locatable?: boolean;
}

export const Image = ({ src, children, className, id, slide, locatable = true }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const preview = usePreview();
  const { members, self } = useMembers();
  const { handleSelect } = useElementSelect(id, false);
  const activeMembers = findActiveMembers(id, slide, members);
  const locatedByMe = activeMembers.some((member) => member.connectionId === self?.connectionId);
  const [firstMember] = activeMembers;
  const { outlineClasses, stickyLabelClasses } = getOutlineClasses(firstMember);
  const memberName = getMemberFirstName(firstMember);
  const name = locatedByMe ? 'You' : memberName;
  const label = activeMembers.length > 1 ? `${name} +${activeMembers.length - 1}` : name;

  useClickOutside(containerRef, self, locatedByMe && !preview);

  return (
    <div
      data-before={label}
      className={cn('relative xs:my-4 md:my-0', className, {
        [`outline-2 outline before:content-[attr(data-before)] before:absolute before:-top-[22px] before:-left-[2px] before:px-[10px] before:text-sm before:text-white before:rounded-t-lg before:normal-case ${outlineClasses} before:${stickyLabelClasses}`]:
          firstMember,
      })}
    >
      <img
        id={id}
        data-id="slide-image-placeholder"
        className="cursor-pointer block"
        src={src}
        onClick={locatable ? handleSelect : undefined}
      />
      {children ? children : null}
    </div>
  );
};
