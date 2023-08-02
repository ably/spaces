import { useContext, useEffect, useReducer } from 'react';
import assign from 'lodash.assign';
import cn from 'classnames';
import find from 'lodash.find';
import omit from 'lodash.omit';
import { CursorSvg, SpacesContext } from '.';
import { useMembers, CURSOR_ENTER, CURSOR_LEAVE, CURSOR_MOVE } from '../hooks';

// TODO: type this
const reducer = (state: any, action: any) => {
  const { connectionId, members, type } = action;
  switch (type) {
    case CURSOR_ENTER:
      return {
        ...state,
        [connectionId]: {
          ...assign(find(members, { connectionId }), action),
        },
      };
    case CURSOR_LEAVE:
      const newState = omit(state, connectionId);
      return {
        ...newState,
      };
    case CURSOR_MOVE:
      return {
        ...state,
        [connectionId]: {
          ...assign(find(members, { connectionId }), action),
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
    if (!space) return;
    space.cursors.subscribe('cursorsUpdate', (cursorUpdate) => {
      const { connectionId } = cursorUpdate;
      const member = find(members, { connectionId });

      // TODO: why is `connectionId !== self?.connectionId` different types?
      if (connectionId !== self?.connectionId && member?.location?.slide === self?.location?.slide)
        dispatch({
          // TODO: type this
          type: cursorUpdate.data.state,
          members,
          ...cursorUpdate,
        });
      else dispatch({ type: CURSOR_LEAVE, connectionId });
    });

    return () => {
      space.cursors.unsubscribe('cursorsUpdate');
    };
  }, [space]);

  return (
    <div className="h-full w-full z-10 pointer-events-none top-0 left-0 absolute">
      {Object.keys(activeCursors).map((cursor: any) => {
        const { connectionId, profileData } = activeCursors[cursor];
        return (
          <div
            key={connectionId}
            style={{
              position: 'absolute',
              top: `${activeCursors[cursor].position.y}px`,
              left: `${activeCursors[cursor].position.x}px`,
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
