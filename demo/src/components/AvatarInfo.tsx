import { useContext, useEffect, useState } from 'react';

import cn from 'classnames';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { type SpaceMember } from '@ably/spaces';
import { type ProfileData } from '../utils/types';
import { NameModalContext, PencilSvg } from '.';

type Props = Omit<SpaceMember, 'profileData'> & {
  isSelf?: boolean;
  isList?: boolean;
  profileData: ProfileData;
};

dayjs.extend(relativeTime);

export const AvatarInfo = ({ isSelf, isConnected, profileData, isList = false, lastEvent }: Props) => {
  const { setIsModalVisible } = useContext(NameModalContext);
  const [currentTime, setCurrentTime] = useState(dayjs());

  const lastSeen = (timestamp: number) => {
    const diffInSeconds = currentTime.diff(timestamp, 'seconds') + 1;

    if (diffInSeconds === 0) {
      return `Last seen a moment ago`;
    } else {
      return `Last seen ${diffInSeconds} second${diffInSeconds === 1 ? '' : 's'} ago`;
    }
  };

  useEffect(() => {
    let intervalId: ReturnType<typeof setTimeout>;

    if (isSelf) return;

    if (!isConnected) {
      intervalId = setInterval(() => {
        setCurrentTime(dayjs());
      }, 1000);
    }

    return () => {
      clearInterval(intervalId);
    };
  }, [isConnected]);

  return isSelf ? (
    <div className="pt-2 absolute top-full hidden group-hover:block">
      <button
        data-id="avatar-hover"
        onClick={() => setIsModalVisible(true)}
        className="bg-slate-800 rounded-lg p-2 flex items-center justify-center text-sm font-semibold text-white whitespace-nowrap overflow-hidden relative group-inner"
      >
        {profileData.name} (You)
        <div className="absolute flex items-center justify-center right-0 bottom-0 top-0 my-auto bg-gradient-to-r from-transparent from-10% to-slate-800 w-8 h-6 to-30% opacity-0 duration-150 transition-all translate-x-2 group-inner-hover:translate-x-0 group-inner-hover:opacity-100">
          <PencilSvg
            width={16}
            height={16}
          />
        </div>
      </button>
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
          {isConnected ? 'Online now' : lastSeen(lastEvent.timestamp)}
        </span>
      </p>
    </div>
  );
};
