import cn from 'classnames';
import { useElementSelect, useMembers } from '../hooks';
import { findActiveMember, getMemberFirstName, getOutlineClasses } from '../utils';

interface Props extends React.HTMLAttributes<HTMLImageElement> {
  src: string;
  children?: React.ReactNode;
  className?: string;
  id: string;
  slide: string;
}

export const Image = ({ src, children, className, id, slide }: Props) => {
  const { members } = useMembers();
  const { handleSelect } = useElementSelect(id);
  const activeMember = findActiveMember(id, slide, members);
  const name = getMemberFirstName(activeMember);
  const outlineClasses = getOutlineClasses(activeMember);

  return (
    <div className={cn('relative xs:my-4 md:my-0', className)}>
      <img
        id={id}
        data-before={name}
        data-id="slide-image-placeholder"
        className={cn('cursor-pointer', {
          [`outline-2 outline before:content-[attr(data-before)] before:absolute before:-top-[22px] before:-left-[2px] before:px-[10px] before:text-sm before:text-white before:rounded-t-lg before:normal-case ${outlineClasses}`]:
            !!activeMember,
        })}
        src={src}
        onClick={handleSelect}
      />
      {children ? children : null}
    </div>
  );
};
