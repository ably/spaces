import { useContext, useEffect, useState } from 'react';
import type { CursorUpdate as _CursorUpdate } from '@ably/spaces';

import cn from 'classnames';
import { CursorSvg, SpacesContext } from '.';
import { useMembers, CURSOR_ENTER, CURSOR_LEAVE, CURSOR_MOVE } from '../hooks';

type state = typeof CURSOR_ENTER | typeof CURSOR_LEAVE | typeof CURSOR_MOVE;
type CursorUpdate = Omit<_CursorUpdate, 'data'> & { data: { state: state } };

export const Cursors = () => {
  const space = useContext(SpacesContext);
  const { self, others } = useMembers();
  const [cursors, setCursors] = useState<{
    [connectionId: string]: { position: CursorUpdate['position']; state: CursorUpdate['data']['state'] };
  }>({});

  useEffect(() => {
    if (!space || !others) return;

    space.cursors.subscribe('update', (cursorUpdate) => {
      const { connectionId, position, data } = cursorUpdate as CursorUpdate;

      if (cursorUpdate.connectionId === self?.connectionId) return;

      setCursors((currentCursors) => ({
        ...currentCursors,
        [connectionId]: { position, state: data.state },
      }));
    });

    return () => {
      space.cursors.unsubscribe('update');
    };
  }, [space, others, self?.connectionId]);

  useEffect(() => {
    const handler = async (member: { connectionId: string }) => {
      setCursors((currentCursors) => ({
        ...currentCursors,
        [member.connectionId]: { position: { x: 0, y: 0 }, state: CURSOR_LEAVE },
      }));
    };

    space?.members.subscribe('leave', handler);

    return () => {
      space?.members.unsubscribe('leave', handler);
    };
  }, [space]);

  const activeCursors = others
    .filter(
      (member) =>
        member.isConnected && cursors[member.connectionId] && cursors[member.connectionId].state !== CURSOR_LEAVE,
    )
    .map((member) => ({
      connectionId: member.connectionId,
      profileData: member.profileData,
      position: cursors[member.connectionId].position,
    }));

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
