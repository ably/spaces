import Spaces from './Spaces.js';

export type { default as Space, SpaceEventMap, SpaceEvents } from './Space.js';

export type { default as Cursors, CursorsEventMap } from './Cursors.js';
export type { default as Locations, LocationsEventMap, LocationsEvents } from './Locations.js';
export type { default as Locks, LocksEventMap, LockOptions } from './Locks.js';
export type { default as Members, MembersEventMap } from './Members.js';

// Can be changed to * when we update to TS5

export default Spaces;

export type {
  CursorsOptions,
  CursorPosition,
  CursorData,
  CursorUpdate,
  SpaceOptions,
  ProfileData,
  SpaceMember,
  Lock,
  LockStatus,
} from './types.js';

export type { LockAttributes } from './Locks.js';

export type { default as EventEmitter, EventListener, EventKey, EventMap } from './utilities/EventEmitter.js';

export type { Subset } from './utilities/types.js';
