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
  lastEvent: {
    name: Types.PresenceAction;
    timestamp: number;
  };
}
