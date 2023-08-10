import cn from 'classnames';
import { useElementSelect, useMembers } from '../hooks';
import { findActiveMember, getMemberFirstName, getOutlineClasses } from '../utils';

interface Props extends React.HTMLAttributes<HTMLHeadingElement> {
  id: string;
  slide: string;
  variant?: 'h1' | 'h2' | 'h3';
}

export const Title = ({ variant = 'h1', className, id, slide, ...props }: Props) => {
  const Component = variant;
  const { members } = useMembers();
  const { handleSelect } = useElementSelect(id);
  const activeMember = findActiveMember(id, slide, members);
  const name = getMemberFirstName(activeMember);
  const outlineClasses = getOutlineClasses(activeMember);

  return (
    <Component
      id={id}
      data-before={name}
      className={cn(
        'relative cursor-pointer',
        {
          'font-semibold text-ably-avatar-stack-demo-slide-text my-2 xs:text-3xl md:text-4xl': variant === 'h1',
          'font-semibold text-ably-avatar-stack-demo-slide-text md:text-2xl': variant === 'h2',
          'font-medium uppercase text-ably-avatar-stack-demo-slide-title-highlight xs:text-xs xs:my-4 md:my-0 md:text-md':
            variant === 'h3',
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
