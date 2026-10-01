export { createSpacesClient, type SpacesClient } from './Spaces.js';

export type { default as Space, SpaceEventMap, SpaceEvents, SpaceState, UpdateProfileDataFunction } from './Space.js';

export type { default as Cursors, CursorsEventMap } from './Cursors.js';
export type { default as Locations, LocationsEventMap, LocationsEvents } from './Locations.js';
export type { default as Locks, LocksEventMap, LockOptions } from './Locks.js';
export type { default as Members, MembersEventMap } from './Members.js';

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
  LockStatuses,
} from './types.js';

export type { LockAttributes } from './Locks.js';

export type { default as EventEmitter, EventListener, EventListenerThis } from './utilities/EventEmitter.js';

export type { Subset } from './utilities/types.js';
