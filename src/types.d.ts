import { Types } from 'ably';

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
  locks: Map<string, LockRequest>;
  lastEvent: {
    name: Types.PresenceAction;
    timestamp: number;
  };
}

export type LockStatus = 'pending' | 'locked' | 'unlocked';

export type Lock = {
  member: SpaceMember;
  request: LockRequest;
};

export type LockRequest = {
  id: string;
  status: LockStatus;
  timestamp: number;
  attributes?: LockAttributes;
  reason?: Types.ErrorInfo;
};
