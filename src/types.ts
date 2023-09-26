import { Types } from 'ably';
import type { LockAttributes } from './Locks.js';

export interface CursorsOptions {
  outboundBatchInterval: number;
  paginationLimit: number;
}

export interface CursorPosition {
  x: number;
  y: number;
}

export type CursorData = Record<string, unknown>;

export interface CursorUpdate {
  clientId: string;
  connectionId: string;
  position: CursorPosition;
  data?: CursorData;
}

export interface SpaceOptions {
  offlineTimeout: number;
  cursors: CursorsOptions;
}

export type ProfileData = Record<string, unknown> | null;

export interface SpaceMember {
  clientId: string;
  connectionId: string;
  isConnected: boolean;
  profileData: ProfileData;
  location: unknown;
  lastEvent: {
    name: Types.PresenceAction;
    timestamp: number;
  };
}

export namespace LockStatuses {
  export type Pending = 'pending';
  export type Locked = 'locked';
  export type Unlocked = 'unlocked';
}

export type LockStatus = LockStatuses.Pending | LockStatuses.Locked | LockStatuses.Unlocked;

export type Lock = {
  id: string;
  status: LockStatus;
  member: SpaceMember;
  timestamp: number;
  attributes?: LockAttributes;
  reason?: Types.ErrorInfo;
};
