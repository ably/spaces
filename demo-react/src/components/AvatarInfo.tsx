import cn from 'classnames';
import { AvatarProps } from './Avatar';

interface Props extends AvatarProps {
  isList?: boolean;
}

export const AvatarInfo = ({ isSelf, isConnected, name, isList = false }: Props) => {
  return isSelf ? (
    <div
      data-id="avatar-hover"
      className="bg-slate-800 rounded-lg p-2 hidden group-hover:block absolute top-full mt-2"
    >
      <p
        data-id="avatar-full-name"
        className="text-sm font-semibold text-white whitespace-nowrap"
      >
        {name} (You)
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
        {name}
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
