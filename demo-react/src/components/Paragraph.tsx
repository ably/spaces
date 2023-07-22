import cn from 'classnames';

interface Props extends React.HTMLAttributes<HTMLParagraphElement> {
  variant?: 'regular' | 'aside';
}

export const Paragraph = ({ variant = 'regular', ...props }: Props) => {
  return (
    <p
      className={cn('text-ably-avatar-stack-demo-slide-text cursor-pointer relative md:absolute', {
        'xs:w-auto xs:text-xs xs:my-4 md:my-0 md:text-lg md:w-1/3': variant === 'regular',
        'text-[13px] leading-6 p-0 md:w-1/5 ': variant === 'aside',
      })}
      {...props}
    />
  );
};
