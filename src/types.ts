import { Types } from 'ably';
import type { LockAttributes } from './Locks.js';

/**
 * Options to configure the behavior of a {@link Cursors | `Cursors`} instance.
 */
export interface CursorsOptions {
  /**
   * The interval, in milliseconds, at which a batch of cursor positions are published. This is multiplied by the number of members in a space, minus 1. The default value is 25ms. Decreasing the value will improve performance by further ‘smoothing’ the movement of cursors at the cost of increasing the number of events sent.
   */
  outboundBatchInterval: number;
  /**
   * The number of pages searched from [history](https://ably.com/docs/storage-history/history) for the last published cursor position. The default is 5.
   */
  paginationLimit: number;
}

/**
 * Represents a cursors position.
 */
export interface CursorPosition {
  /**
   * The position of the member’s cursor on the X-axis.
   */
  x: number;
  /**
   * The position of the member’s cursor on the Y-axis.
   */
  y: number;
}

/**
 * Represents data that can be associated with a cursor update. A JSON-serializable object containing additional information about the cursor, such as a color or the ID of an element the cursor is dragging.
 */
export type CursorData = Record<string, unknown>;

/**
 * Represents a cursor update event.
 *
 * The following is an example payload of a cursor event. Cursor events are uniquely identifiable by the {@link CursorUpdate.connectionId | `connectionId`} of a cursor.
 *
 * ```json
 * {
 *   "hd9743gjDc": {
 *     "connectionId": "hd9743gjDc",
 *     "clientId": "clemons#142",
 *     "position": {
 *       "x": 864,
 *       "y": 32
 *     },
 *     "data": {
 *       "color": "red"
 *     }
 *   }
 * }
 * ```
 */
export interface CursorUpdate {
  /**
   * The [client identifier](https://ably.com/docs/auth/identified-clients) for the member.
   */
  clientId: string;
  /**
   * The unique identifier of the member’s [connection](https://ably.com/docs/connect).
   */
  connectionId: string;
  /**
   * An object containing the position of a member’s cursor.
   */
  position: CursorPosition;
  /**
   * An optional arbitrary JSON-serializable object containing additional information about the cursor.
   */
  data?: CursorData;
}

/**
 * Options to configure a {@link Space | Space} instance on its creation.
 */
export interface SpaceOptions {
  /**
   * Number of milliseconds after a user loses connection or closes their browser window to wait before their {@link SpaceMember} object is removed from the members list. The default is 120000ms (2 minutes).
   */
  offlineTimeout: number;
  /**
   * Options to configure live cursors behavior.
   */
  cursors: CursorsOptions;
}

/**
 * Optional data that is associated with a member. Examples include a preferred username, or a profile picture that can be subsequently displayed in their avatar. Can be any arbitrary JSON-serializable object.
 */
export type ProfileData = Record<string, unknown> | null;

/**
 * Represents a member within a Space instance. Each new connection that enters will create a new member, even if they have the same [`clientId`](https://ably.com/docs/auth/identified-clients).
 *
 * The following is an example payload of a `SpaceMember`:
 *
 * ```json
 * {
 *  "clientId": "clemons#142",
 *  "connectionId": "hd9743gjDc",
 *  "isConnected": false,
 *  "lastEvent": {
 *    "name": "leave",
 *    "timestamp": 1677595689759
 *  },
 *  "location": null,
 *  "profileData": {
 *    "username": "Claire Lemons",
 *    "avatar": "https://slides-internal.com/users/clemons.png"
 *    }
 * }
 * ```
 */
export interface SpaceMember {
  /**
   * The [client identifier](https://ably.com/docs/auth/identified-clients) for the member.
   */
  clientId: string;
  /**
   * The unique identifier of the member’s [connection](https://ably.com/docs/connect).
   */
  connectionId: string;
  /**
   * Whether the user is connected to Ably or not.
   */
  isConnected: boolean;
  /**
   * Optional data that is associated with a member, such as a preferred username or profile picture to display in an avatar stack.
   */
  profileData: ProfileData;
  /**
   * The current location of the user within the space.
   */
  location: unknown;
  /**
   * The most recent event emitted by [presence](https://ably.com/docs/presence-occupancy/presence) and its timestamp. Events will be either `enter`, `leave`, `update` or `present`.
   */
  lastEvent: {
    /**
     * The most recent event emitted by the member.
     */
    name: Types.PresenceAction;
    /**
     * The timestamp of the most recently emitted event.
     */
    timestamp: number;
  };
}

/**
 * Describes the possible values of the {@link LockStatus} type.
 */
export namespace LockStatuses {
  /**
   * A member has requested a lock by calling {@link Locks.acquire | `acquire()`}.
   */
  export type Pending = 'pending';
  /**
   * A lock is confirmed to be held by the requesting member.
   */
  export type Locked = 'locked';
  /**
   * A lock is confirmed to not be locked by the requesting member, or has been {@link Locks.release | released} by a member previously holding the lock.
   */
  export type Unlocked = 'unlocked';
}

/**
 * Represents the status of a lock.
 */
export type LockStatus = LockStatuses.Pending | LockStatuses.Locked | LockStatuses.Unlocked;

/**
 * Represents a Lock.
 */
export type Lock = {
  /**
   * The unique ID of the lock request.
   */
  id: string;
  /**
   * The status of the lock event.
   */
  status: LockStatus;
  /**
   * Information about the member who requested the lock.
   */
  member: SpaceMember;
  /**
   * The timestamp of the lock event.
   */
  timestamp: number;
  /**
   * The optional attributes of the lock, such as the ID of the component it relates to.
   */
  attributes?: LockAttributes;
  /**
   * The reason why the lock status is {@link LockStatuses.Unlocked | `unlocked`}.
   */
  reason?: Types.ErrorInfo;
};
