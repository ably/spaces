import cn from 'classnames';
import { type SpaceMember } from '../../../src/types';
import { type ProfileData } from '../utils/types';

type Props = Omit<SpaceMember, 'profileData'> & {
  isSelf?: boolean;
  isList?: boolean;
  profileData: ProfileData;
};

export const AvatarInfo = ({ isSelf, isConnected, profileData, isList = false }: Props) => {
  return isSelf ? (
    <div
      data-id="avatar-hover"
      className="bg-slate-800 rounded-lg p-2 hidden group-hover:block absolute top-full mt-2"
    >
      <p
        data-id="avatar-full-name"
        className="text-sm font-semibold text-white whitespace-nowrap"
      >
        {profileData.name} (You)
      </p>
    </div>
  ) : (
    <div
      data-id="avatar-hover"
      className={cn('bg-slate-800 hover:bg-slate-700 rounded-lg p-2 hidden group-hover:block top-full', {
        'absolute mt-2': !isList,
      })}
    >
      <p
        className="text-sm font-semibold text-white whitespace-nowrap"
        data-id="avatar-full-name"
      >
        {profileData.name}
      </p>
      <p className="whitespace-nowrap flex gap-1 items-center">
        <span
          data-id="avatar-status-indicator"
          className={cn({
            'text-slate-500': !isConnected,
            'text-[#11CB24]': isConnected,
          })}
        >
          ●
        </span>
        <span
          data-id="avatar-status"
          className="text-xs text-white"
        >
          {isConnected ? 'Online now' : 'Left a few minutes ago'}
        </span>
      </p>
    </div>
  );
};
