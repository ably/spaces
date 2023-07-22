import cn from 'classnames';

interface Props extends React.HTMLAttributes<HTMLHeadingElement> {
  variant?: 'h1' | 'h2' | 'h3';
}

export const Title = ({ variant = 'h1', ...props }: Props) => {
  const Component = variant;
  return (
    <Component
      data-id="slide-title-text"
      className={cn({
        'font-semibold text-ably-avatar-stack-demo-slide-text cursor-pointer relative my-2 xs:text-2xl xs:w-full md:text-4xl md:w-3/5 md:absolute':
          variant === 'h1',
        'font-semibold text-ably-avatar-stack-demo-slide-text cursor-pointer relative md:text-2xl md:absolute':
          variant === 'h2',
        'font-medium relative uppercase cursor-pointer text-ably-avatar-stack-demo-slide-title-highlight xs:text-xs xs:my-4 md:my-0 md:text-md md:absolute':
          variant === 'h3',
      })}
      {...props}
    />
  );
};
