import { Avatar } from './Avatar';
import cn from 'classnames';
import { AvatarInfo } from './AvatarInfo';
import { SpaceMember } from '@ably-labs/spaces';

interface Props {
  isInContent?: boolean;
  avatars: SpaceMember[];
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
            className="h-[46px] w-[46px] rounded-full flex items-center justify-center bg-gradient-to-b from-white to-white ml-[-9px] relative group"
            data-id="avatar-wrapper"
          >
            <div
              className="h-[40px] w-[40px] rounded-full flex items-center justify-center bg-[#75A3E3]"
              data-id="avatar-inner-wrapper"
            >
              <p className="font-medium text-sm text-white">
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
