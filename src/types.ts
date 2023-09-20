import { Types } from 'ably';
import type { LockAttributes } from './Locks.js';

/**
 * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
 * ```ts
 * type CursorsOptions = {
 *   outboundBatchInterval?: number;
 *   paginationLimit?: number;
 * };
 * ```
 * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
 */
export interface CursorsOptions {
  /**
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * The interval in milliseconds at which a batch of cursor positions are published. This is multiplied by the number of members in the space minus 1. The default value is 25ms.
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   */
  outboundBatchInterval: number;
  /**
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * The number of pages searched from [history](https://ably.com/docs/storage-history/history) for the last published cursor position. The default is 5.
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   */
  paginationLimit: number;
}

/**
 * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
 * Represents a cursors position.
 *
 * ```ts
 * type CursorPosition = {
 *   x: number;
 *   y: number;
 * };
 * ```
 * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
 */
export interface CursorPosition {
  x: number;
  y: number;
}

/**
 * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
 * Represent data that can be associated with a cursor update.
 *
 * ```ts
 * type CursorData = Record<string, unknown>;
 * ```
 * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
 */
export type CursorData = Record<string, unknown>;

/**
 * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
 * Represents an update to a cursor.
 *
 * ```ts
 * type CursorUpdate = {
 *   name: string;
 *   clientId: string;
 *   connectionId: string;
 *   position: CursorPosition;
 *   data?: CursorData;
 * };
 * ```
 * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
 */
export interface CursorUpdate {
  clientId: string;
  connectionId: string;
  position: CursorPosition;
  data?: CursorData;
}

/**
 * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
 * Used to configure a Space instance on creation.
 *
 * ```ts
 * type SpaceOptions = {
 *   offlineTimeout?: number;
 *   cursors?: CursorsOptions;
 * };
 * ```
 * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
 */
export interface SpaceOptions {
  /**
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * Number of milliseconds after a user loses connection or closes their browser window to wait before their [SpaceMember](#spacemember) object is removed from the members list. The default is 120000ms (2 minutes).
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   */
  offlineTimeout: number;
  /**
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * Options relating to configuring the cursors API (see below).
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   */
  cursors: CursorsOptions;
}

export type ProfileData = Record<string, unknown> | null;

/**
 * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
 * A SpaceMember represents a member within a Space instance. Each new connection that enters will create a new member, even if they have the same [`clientId`](https://ably.com/docs/auth/identified-clients?lang=javascript).
 *
 * ```ts
 * type SpaceMember = {
 *   clientId: string;
 *   connectionId: string;
 *   isConnected: boolean;
 *   profileData: Record<string, unknown>;
 *   location: Location;
 *   lastEvent: PresenceEvent;
 * };
 * ```
 * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
 */
export interface SpaceMember {
  /**
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * The client identifier for the user, provided to the ably client instance.
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   */
  clientId: string;
  /**
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * Identifier for the connection used by the user. This is a unique identifier.
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   */
  connectionId: string;
  /**
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * Whether the user is connected to Ably.
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   */
  isConnected: boolean;
  /**
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * Optional user data that can be attached to a user, such as a username or image to display in an avatar stack.
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   */
  profileData: ProfileData;
  /**
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * The current location of the user within the space.
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   */
  location: unknown;
  /**
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * The most recent event emitted by [presence](https://ably.com/docs/presence-occupancy/presence?lang=javascript) and its timestamp. Events will be either `enter`, `leave`, `update` or `present`.
   * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
   */
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

/**
 * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
 * Represents a status of a lock.
 *
 * ```ts
 * type LockStatus = 'pending' | 'locked' | 'unlocked';
 * ```
 * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
 */
export type LockStatus = LockStatuses.Pending | LockStatuses.Locked | LockStatuses.Unlocked;

/**
 * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
 * Represents a Lock.
 *
 * ```ts
 * type Lock = {
 *   id: string;
 *   status: LockStatus;
 *   member: SpaceMember;
 *   timestamp: number;
 *   attributes?: LockAttributes;
 *   reason?: Types.ErrorInfo;
 * };
 * ```
 * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
 */
export type Lock = {
  id: string;
  status: LockStatus;
  member: SpaceMember;
  timestamp: number;
  attributes?: LockAttributes;
  reason?: Types.ErrorInfo;
};
