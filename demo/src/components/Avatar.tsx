import cn from 'classnames';
import { SpaceMember } from '@ably-labs/spaces';

import { AvatarInfo } from './AvatarInfo';
import { LightningSvg } from './svg';

export interface AvatarProps extends SpaceMember {
  isInContent?: boolean;
  isSelf?: boolean;
}

export const Avatar = ({
  isSelf = false,
  isConnected = false,
  isInContent = false,
  profileData,
  ...spaceProps
}: AvatarProps) => {
  const initials = profileData.name
    .split(' ')
    .map((n: string) => n[0])
    .join('');

  return (
    <div
      className={cn(
        'rounded-full group relative flex items-center justify-center xs:h-[32px] xs:w-[32px] md:h-[46px] md:w-[46px]',
        {
          'bg-gradient-to-b from-yellow-400 to-yellow-500 ': isSelf,
          'bg-white': !isSelf && !isInContent,
          'bg-[#F7F6F9]': isInContent,
        },
      )}
      data-id="avatar-wrapper"
    >
      {isSelf && <LightningSvg className="absolute left-[-5px] bottom-[-8px]" />}

      <div
        className={cn(
          'rounded-full flex items-center justify-center xs:h-[32px] xs:w-[32px] md:h-[40px] md:w-[40px] bg-gradient-to-tr',
          profileData.color.gradientStart.tw,
          profileData.color.gradientEnd.tw,
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

      {!isInContent && (
        <AvatarInfo
          isSelf={isSelf}
          profileData={profileData}
          isConnected={isConnected}
          {...spaceProps}
        />
      )}
    </div>
  );
};