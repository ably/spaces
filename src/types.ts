import { Types } from 'ably';
import type { LockAttributes } from './Locks.js';

/**
 * Options to configure the behaviour of a {@link Cursors | `Cursors`} instance.
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
 * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
 */
export interface CursorPosition {
  /**
   * <!-- MOVED FROM Cursors.set -->
   * The position of the member’s cursor on the X-axis.
   */
  x: number;
  /**
   * <!-- MOVED FROM Cursors.set -->
   * The position of the member’s cursor on the Y-axis.
   */
  y: number;
}

/**
 * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
 * Represent data that can be associated with a cursor update.
 * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
 */
export type CursorData = Record<string, unknown>;

/**
 * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
 * Represents an update to a cursor.
 * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
 */
export interface CursorUpdate {
  /**
   * <!-- MOVED FROM Cursors.set -->
   * The [client identifier](https://ably.com/docs/auth/identified-clients) for the member.
   */
  clientId: string;
  /**
   * <!-- MOVED FROM Cursors.set -->
   * The unique identifier of the member’s [connection](https://ably.com/docs/connect).
   */
  connectionId: string;
  /**
   * <!-- MOVED FROM Cursors.set -->
   * An object containing the position of a member’s cursor.
   */
  position: CursorPosition;
  /**
   * <!-- MOVED FROM Cursors.set -->
   * An optional arbitrary JSON-serializable object containing additional information about the cursor.
   */
  data?: CursorData;
}

/**
 * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
 * Used to configure a Space instance on creation.
 * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
 */
export interface SpaceOptions {
  /**
   * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
   * Number of milliseconds after a user loses connection or closes their browser window to wait before their {@link SpaceMember} object is removed from the members list. The default is 120000ms (2 minutes).
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

/**
 * <!-- MOVED WITH EDITING FROM Space.enter -->
 * Profile data can be set when {@link Space.enter | entering } a space. It is optional data that can be used to associate information with a member, such as a preferred username, or profile picture that can be subsequently displayed in their avatar. Profile data can be any arbitrary JSON-serializable object.
 */
export type ProfileData = Record<string, unknown> | null;

/**
 * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
 * A SpaceMember represents a member within a Space instance. Each new connection that enters will create a new member, even if they have the same [`clientId`](https://ably.com/docs/auth/identified-clients?lang=javascript).
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
    /**
     * <!-- MOVED FROM Locations.subscribe -->
     * The most recent event emitted by the member.
     */
    name: Types.PresenceAction;
    /**
     * <!-- MOVED FROM Locations.subscribe -->
     * The timestamp of the most recently emitted event.
     */
    timestamp: number;
  };
}

/**
 * The `LockStatuses` namespace describes the possible values of the {@link LockStatus} type.
 */
export namespace LockStatuses {
  /**
   * <!-- MOVED WITH EDITING FROM Locks -->
   * A member has requested a lock by calling { @link Locks.acquire | `acquire()` }.
   */
  export type Pending = 'pending';
  /**
   * <!-- MOVED FROM Locks -->
   * The lock is confirmed to be held by the requesting member.
   */
  export type Locked = 'locked';
  /**
   * <!-- MOVED WITH EDITING FROM Locks -->
   * The lock is confirmed to not be locked by the requesting member, or has been { @link Locks.release | released } by a member previously holding the lock.
   */
  export type Unlocked = 'unlocked';
}

/**
 * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
 * Represents a status of a lock.
 * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
 */
export type LockStatus = LockStatuses.Pending | LockStatuses.Locked | LockStatuses.Unlocked;

/**
 * <!-- BEGIN CLASS-DEFINITIONS DOCUMENTATION -->
 * Represents a Lock.
 * <!-- END CLASS-DEFINITIONS DOCUMENTATION -->
 */
export type Lock = {
  /**
   * <!-- MOVED FROM Locks.subscribe -->
   * The unique ID of the lock request.
   */
  id: string;
  /**
   * <!-- MOVED WITH EDITING FROM Locks.subscribe -->
   * The lock status of the event.
   */
  status: LockStatus;
  /**
   * Information about the space member who requested the lock.
   */
  member: SpaceMember;
  /**
   * <!-- MOVED FROM Locks.subscribe -->
   * The timestamp of the lock event.
   */
  timestamp: number;
  /**
   * <!-- MOVED FROM Locks.subscribe -->
   * The optional attributes of the lock, such as the ID of the component it relates to.
   */
  attributes?: LockAttributes;
  /**
   * <!-- MOVED FROM Locks.subscribe -->
   * The reason why the `request.status` is `unlocked`.
   */
  reason?: Types.ErrorInfo;
};
