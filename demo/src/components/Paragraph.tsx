import cn from 'classnames';
import { useElementSelect, useMembers } from '../hooks';
import { findActiveMember, getMemberFirstName, getOutlineClasses } from '../utils';

interface Props extends React.HTMLAttributes<HTMLParagraphElement> {
  id: string;
  slide: string;
  variant?: 'regular' | 'aside';
}

export const Paragraph = ({ variant = 'regular', id, slide, className, ...props }: Props) => {
  const { members } = useMembers();
  const { handleSelect } = useElementSelect(id);
  const activeMember = findActiveMember(id, slide, members);
  const name = getMemberFirstName(activeMember);
  const outlineClasses = getOutlineClasses(activeMember);

  return (
    <p
      id={id}
      data-before={name}
      className={cn(
        'text-ably-avatar-stack-demo-slide-text cursor-pointer relative',
        {
          'xs:w-auto xs:text-xs xs:my-4 md:my-0 md:text-lg': variant === 'regular',
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
