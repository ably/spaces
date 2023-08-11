import cn from 'classnames';
import { useElementSelect, useMembers, useLockLabelCallback } from '../hooks';
import { findActiveMember, getMemberFirstName, getOutlineClasses } from '../utils';

interface Props extends React.HTMLAttributes<HTMLImageElement> {
  src: string;
  children?: React.ReactNode;
  className?: string;
  id: string;
  slide: string;
}

export const Image = ({ src, children, className, id, slide }: Props) => {
  const { members, self } = useMembers();
  const { handleSelect } = useElementSelect(id);
  const activeMember = findActiveMember(id, slide, members);
  const outlineClasses = getOutlineClasses(activeMember);
  const label = useLockLabelCallback(slide, id, self?.connectionId) || getMemberFirstName(activeMember);

  return (
    <div
      data-before={label}
      className={cn('relative xs:my-4 md:my-0', className, {
        [`outline-2 outline before:content-[attr(data-before)] before:absolute before:-top-[22px] before:-left-[2px] before:px-[10px] before:text-sm before:text-white before:rounded-t-lg before:normal-case ${outlineClasses}`]:
          !!activeMember,
      })}
    >
      <img
        id={id}
        data-id="slide-image-placeholder"
        className="cursor-pointer block"
        src={src}
        onClick={handleSelect}
      />
      {children ? children : null}
    </div>
  );
};
