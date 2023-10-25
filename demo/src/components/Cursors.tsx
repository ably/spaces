import { useCursors } from '@ably/spaces/react';
import cn from 'classnames';
import { CursorSvg } from '.';
import { CURSOR_LEAVE } from '../hooks';

export const Cursors = () => {
  const { space, cursors } = useCursors({ returnCursors: true });

  const activeCursors = Object.keys(cursors)
    .filter((connectionId) => {
      const { member, cursorUpdate } = cursors[connectionId]!!;
      return (
        member.connectionId !== space.connectionId && member.isConnected && cursorUpdate.data.state !== CURSOR_LEAVE
      );
    })
    .map((connectionId) => {
      const { member, cursorUpdate } = cursors[connectionId]!!;
      return {
        connectionId: member.connectionId,
        profileData: member.profileData,
        position: cursorUpdate.position,
      };
    });

  return (
    <div className="h-full w-full z-10 pointer-events-none top-0 left-0 absolute">
      {activeCursors.map((cursor) => {
        const { connectionId, profileData } = cursor;

        return (
          <div
            key={connectionId}
            style={{
              position: 'absolute',
              top: `${cursor.position.y}px`,
              left: `${cursor.position.x}px`,
            }}
          >
            <CursorSvg
              startColor={profileData.color.gradientStart.hex}
              endColor={profileData.color.gradientEnd.hex}
              id={connectionId}
            />
            <p
              className={cn(
                profileData.color.gradientStart.tw,
                profileData.color.gradientEnd.tw,
                'py-2 px-4 bg-gradient-to-b rounded-full absolute text-white text-base truncate transition-all max-w-[120px]',
              )}
            >
              {profileData.name.split(' ')[0]}
            </p>
          </div>
        );
      })}
    </div>
  );
};
