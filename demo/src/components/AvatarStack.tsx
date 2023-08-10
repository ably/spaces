import { Avatar } from './Avatar';

import cn from 'classnames';
import { AvatarInfo } from './AvatarInfo';

import { type AvatarProps } from './Avatar';

interface Props {
  isInContent?: boolean;
  avatars: AvatarProps[];
}

export const AvatarStack = ({ isInContent = false, avatars }: Props) => {
  const largeAvatars = avatars.slice(0, 4);
  const hiddenAvatars = avatars.slice(4);

  return (
    <ul
      className={cn('flex', {
        'absolute scale-[3] top-[800px] left-[1220px] translate-x-[-100%]': isInContent,
      })}
    >
      {largeAvatars.map((avatar) => (
        <li
          key={avatar.connectionId}
          className="ml-[-9px] relative"
        >
          <Avatar
            {...avatar}
            isInContent={isInContent}
          />
        </li>
      ))}

      {hiddenAvatars.length > 0 && (
        <li>
          <div
            className={cn(
              'h-[36px] w-[36px] md:h-[46px] md:w-[46px] rounded-full flex items-baseline md:items-center justify-center bg-white ml-[-9px] relative group',
              {
                'bg-white': !isInContent,
                'bg-[#F7F6F9]': isInContent,
              },
            )}
            data-id="avatar-wrapper"
          >
            <div
              className="h-[32px] w-[32px] md:h-[40px] md:w-[40px] rounded-full flex items-center justify-center bg-[#75A3E3]"
              data-id="avatar-inner-wrapper"
            >
              <p className="font-medium text-xs md:text-sm text-white">
                +<span data-id="count">{hiddenAvatars.length}</span>
              </p>
            </div>

            {!isInContent && (
              <div className="hidden group-hover:block absolute top-full z-10">
                <div
                  data-id="avatar-hover"
                  className="bg-slate-800 rounded-lg p-1 min-w-[225px] max-h-[250px] overflow-scroll mt-2"
                >
                  {hiddenAvatars.map((avatar, index) => (
                    <AvatarInfo
                      key={`avatarInfo-${index}`}
                      isList
                      {...avatar}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </li>
      )}
    </ul>
  );
};
