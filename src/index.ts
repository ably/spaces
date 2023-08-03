import Spaces from './Spaces.js';

export type Space = Awaited<ReturnType<Spaces['get']>>;

// Can be changed to * when we update to TS5
export type {
  CursorsOptions,
  CursorPosition,
  CursorData,
  CursorUpdate,
  SpaceOptions,
  ProfileData,
  SpaceMember,
} from './types.js';
