import cn from 'classnames';
import { useElementSelect, useMembers, useLockLabelCallback } from '../hooks';
import { findActiveMember, getMemberFirstName, getOutlineClasses } from '../utils';

interface Props extends React.HTMLAttributes<HTMLParagraphElement> {
  id: string;
  slide: string;
  variant?: 'regular' | 'aside';
}

export const Paragraph = ({ variant = 'regular', id, slide, className, ...props }: Props) => {
  const { members, self } = useMembers();
  const { handleSelect } = useElementSelect(id);
  const activeMember = findActiveMember(id, slide, members);
  const outlineClasses = getOutlineClasses(activeMember);
  const label = useLockLabelCallback(slide, id, self?.connectionId) || getMemberFirstName(activeMember);

  return (
    <p
      id={id}
      data-before={label}
      className={cn(
        'text-ably-avatar-stack-demo-slide-text cursor-pointer relative',
        {
          'xs:w-auto text-xs xs:text-base md:text-lg xs:my-4 md:my-0': variant === 'regular',
          'text-[13px] p-0 leading-6': variant === 'aside',
          [`outline-2 outline before:content-[attr(data-before)] before:absolute before:-top-[22px] before:-left-[2px] before:px-[10px] before:text-sm before:text-white before:rounded-t-lg before:normal-case ${outlineClasses}`]:
            !!activeMember,
        },
        className,
      )}
      {...props}
      onClick={handleSelect}
    />
  );
};
