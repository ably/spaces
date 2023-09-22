import Spaces from './Spaces.js';

export type Space = Awaited<ReturnType<Spaces['get']>>;

// Note: this should be the only non-type export from this file,
// otherwise the rollup IIFE build will export an object instead of a constructor
export default Spaces;

// Can be changed to * when we update to TS5
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
