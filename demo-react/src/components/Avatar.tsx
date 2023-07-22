import cn from 'classnames';
import { AvatarInfo } from './AvatarInfo';

export interface AvatarProps {
  isCurrent?: boolean;
  name: string;
  isActive?: boolean;
  color?: string;
}

export const Avatar = ({
  isCurrent = false,
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
          'bg-gradient-to-b from-yellow-400 to-yellow-500 ': isCurrent,
          'bg-white': !isCurrent,
        },
      )}
      data-id="avatar-wrapper"
    >
      {isCurrent && (
        <svg
          width="26"
          height="26"
          viewBox="0 0 26 26"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute left-[-5px] bottom-[-8px]"
          data-id="avatar-lightning"
        >
          <g clip-path="url(#clip0_43_794)">
            <path
              d="M9.41064 23.6221C9.32661 24.0422 9.53165 24.4671 9.91283 24.6627C10.294 24.8583 10.7587 24.7772 11.0511 24.464L20.6951 14.1311C20.9135 13.8971 21.0006 13.5697 20.9275 13.2581C20.8544 12.9466 20.6306 12.6921 20.331 12.5797L15.5832 10.7993L16.8011 4.70993C16.8851 4.2898 16.6801 3.86493 16.2989 3.6693C15.9177 3.47367 15.453 3.55481 15.1607 3.86803L5.51663 14.2009C5.29829 14.4348 5.21111 14.7623 5.28423 15.0739C5.35736 15.3854 5.58114 15.6399 5.88076 15.7522L10.6285 17.5326L9.41064 23.6221Z"
              fill="#FFCB01"
              stroke="white"
              stroke-width="1.91682"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </g>
          <defs>
            <clipPath id="clip0_43_794">
              <rect
                width="26"
                height="26"
                fill="white"
              />
            </clipPath>
          </defs>
        </svg>
      )}

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
          isCurrent={isCurrent}
          name={name}
          isActive={isActive}
        />
      }
    </div>
  );
};
