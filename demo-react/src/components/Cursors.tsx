import { useContext, useEffect, useReducer } from 'react';
import assign from 'lodash.assign';
import cn from 'classnames';
import find from 'lodash.find';
import omit from 'lodash.omit';
import { CursorSvg, SpacesContext } from '.';
import { useMembers, CURSOR_ENTER, CURSOR_LEAVE, CURSOR_MOVE } from '../hooks';
import { SpaceMember } from '@ably-labs/spaces';

type ActionType = 'move' | 'enter' | 'leave';

interface Action {
  type: ActionType;
  data: {
    connectionId: string;
    members?: SpaceMember[];
    position?: {
      x: number;
      y: number;
    };
  };
}

interface State {
  [connectionId: string]: SpaceMember & Action['data'];
}

const reducer = (state: State, action: Action): State => {
  const { type, data } = action;
  const { connectionId, members, position } = data;
  switch (type) {
    case CURSOR_ENTER:
      return {
        ...state,
        [connectionId]: {
          ...assign(find(members, { connectionId }), { connectionId, position }),
        },
      };
    case CURSOR_LEAVE:
      return {
        ...omit(state, connectionId),
      };
    case CURSOR_MOVE:
      return {
        ...state,
        [connectionId]: {
          ...assign(find(members, { connectionId }), { connectionId, position }),
        },
      };
    default:
      throw new Error('Unknown dispatch type');
  }
};

export const Cursors = () => {
  const space = useContext(SpacesContext);
  const { self, members } = useMembers();
  const [activeCursors, dispatch] = useReducer(reducer, {});

  useEffect(() => {
    if (!space || !members) return;

    space.cursors.subscribe('cursorsUpdate', (cursorUpdate) => {
      const { connectionId } = cursorUpdate;
      const member = find<SpaceMember>(members, { connectionId });

      if (
        connectionId !== self?.connectionId &&
        member?.location?.slide === self?.location?.slide &&
        cursorUpdate.data
      ) {
        dispatch({
          type: cursorUpdate.data.state as ActionType,
          data: {
            connectionId,
            members,
            position: cursorUpdate.position,
          },
        });
      } else {
        dispatch({
          type: CURSOR_LEAVE,
          data: {
            connectionId,
            members,
          },
        });
      }
    });

    return () => {
      space.cursors.unsubscribe('cursorsUpdate');
    };
  }, [space, members]);

  return (
    <div className="h-full w-full z-10 pointer-events-none top-0 left-0 absolute">
      {Object.keys(activeCursors).map((cursor) => {
        const { connectionId, profileData } = activeCursors[cursor];
        return (
          <div
            key={connectionId}
            style={{
              position: 'absolute',
              top: `${activeCursors[cursor].position?.y}px`,
              left: `${activeCursors[cursor].position?.x}px`,
            }}
          >
            <CursorSvg
              startColor={profileData?.color?.gradientStart?.hex}
              endColor={profileData?.color?.gradientEnd?.hex}
              id={connectionId}
            />
            {profileData?.name ? (
              <p
                className={cn(
                  profileData.color.gradientStart.tw,
                  profileData.color.gradientEnd.tw,
                  'py-2 px-4 bg-gradient-to-b rounded-full absolute text-white text-base truncate transition-all max-w-[120px]',
                )}
              >
                {profileData.name.split(' ')[0]}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
