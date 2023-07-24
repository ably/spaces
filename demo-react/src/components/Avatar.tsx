import cn from 'classnames';
import { AvatarInfo } from './AvatarInfo';
import { LightningSvg } from './svg';

export interface AvatarProps {
  isSelf?: boolean;
  name: string;
  isActive?: boolean;
  color?: string;
}

export const Avatar = ({
  isSelf = false,
  name,
  isActive = false,
  color = 'bg-gradient-to-tr from-blue-400 to-blue-500',
}: AvatarProps) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('');

  return (
    <div
      className={cn(
        'rounded-full group relative flex items-center justify-center xs:h-[32px] xs:w-[32px] md:h-[46px] md:w-[46px]',
        {
          'bg-gradient-to-b from-yellow-400 to-yellow-500 ': isSelf,
          'bg-white': !isSelf,
        },
      )}
      data-id="avatar-wrapper"
    >
      {isSelf && <LightningSvg className="absolute left-[-5px] bottom-[-8px]" />}

      <div
        className={cn(
          'rounded-full flex items-center justify-center xs:h-[32px] xs:w-[32px] md:h-[40px] md:w-[40px]',
          color,
        )}
        data-id="avatar-inner-wrapper"
      >
        <p
          data-id="name"
          className="font-medium text-sm text-white"
        >
          {initials}
        </p>
      </div>

      {
        <AvatarInfo
          isSelf={isSelf}
          name={name}
          isActive={isActive}
        />
      }
    </div>
  );
};
