import Spaces from './Spaces.js';

export type Space = Awaited<ReturnType<Spaces['get']>>;

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

export { LockAttributes } from './Locks.js';
