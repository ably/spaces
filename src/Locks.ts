import { PresenceMessage } from 'ably';

import Space from './Space.js';
import type { Lock, SpaceMember } from './types.js';
import type { PresenceMember } from './utilities/types.js';
import { ERR_LOCK_IS_LOCKED, ERR_LOCK_INVALIDATED, ERR_LOCK_REQUEST_EXISTS, ERR_NOT_ENTERED_SPACE } from './Errors.js';
import EventEmitter, { InvalidArgumentError, inspect, type EventListener } from './utilities/EventEmitter.js';

import SpaceUpdate from './SpaceUpdate.js';

/**
 * Additional attributes that can be set when acquiring a lock.
 */
export type LockAttributes = Record<string, unknown>;

/**
 * Options for customizing the behavior of {@link Locks.get | `Locks.get()`}.
 */
export interface LockOptions {
  /**
   * Additional metadata to associate with the lock, such as the identifier of a UI component.
   */
  attributes: LockAttributes;
}

/**
 * The property names of `LocksEventMap` are the names of the events emitted by {@link Locks}.
 */
export interface LocksEventMap {
  /**
   * A lock’s state transitioned into {@link LockStatuses.Locked} or {@link LockStatuses.Unlocked}.
   */
  update: Lock;
}

/**
 * [Component locking](https://ably.com/docs/spaces/locking) enables members to optimistically lock stateful UI components before editing them. This reduces the chances of conflicting changes being made to the same component by different members. A component could be a cell in a spreadsheet that a member is updating, or an input field on a form they’re filling in.
 *
 * Once a lock has been acquired by a member, the component that it relates to can be updated in the UI to visually indicate to other members that it is locked and and which member has the lock. The component can then be updated once the editing member has released the lock to indicate that it is now unlocked.
 *
 * Each lock is identified by a unique string ID, and only a single member may hold a lock with a given string at any one time. A lock will exist in one of three {@link LockStatus | states} and may only transition between states in specific circumstances.
 *
 * The following lock state transitions may occur:
 *
 * - None → `pending`: a member calls {@link acquire | `acquire()` } to request a lock.
 * - `pending` → `locked`: the requesting member holds the lock.
 * - `pending` → `unlocked`: the requesting member does not hold the lock, since another member already holds it.
 * - `locked` → `unlocked`: the lock was either explicitly {@link release | released} by the member, or their request was invalidated by a concurrent request which took precedence.
 * - `unlocked` → `locked`: the requesting member reacquired a lock they previously held.
 *
 * Only lock transitions that result in a `locked` or `unlocked` status will emit a lock {@link LocksEventMap.update | update} event.
 *
 * > **Note**
 * >
 * > Optimistic locking means that there is a chance that two members may begin editing the same UI component before it is confirmed which member holds the lock. On average, the time taken to reconcile which member holds a lock is in the hundreds of milliseconds. Your application needs to handle the member that successfully obtained the lock, as well as the member that had their request invalidated.
 *
 */
export default class Locks extends EventEmitter<LocksEventMap> {
  // locks tracks the local state of locks, which is used to determine whether
  // a lock's status has changed when processing presence updates.
  //
  // The top-level map keys are lock identifiers, the second-level map keys are
  // member connectionIds, and the values are the state of locks those members
  // have requested.
  private locks: Map<string, Map<string, Lock>>;

  /** @internal */
  constructor(
    private space: Space,
    private presenceUpdate: Space['presenceUpdate'],
  ) {
    super();
    this.locks = new Map();
  }

  /**
   * Query whether a lock is currently locked, and if locked, return which member holds the lock. A lock is identifiable by its unique string ID.
   *
   * The following is an example of checking whether a lock identifier is currently locked:
   *
   * ```javascript
   * const isLocked = space.locks.get(id) !== undefined;
   * ```
   * The following is an example of checking which member holds the lock:
   *
   * ```javascript
   * const { member } = space.locks.get(id);
   * ```
   * The following is an example of viewing the attributes assigned to the lock by the member holding it:
   *
   * ```javascript
   * const { request } = space.locks.get(id);
   * const viewLock = request.attributes.get(key);
   * ```
   *
   * If the lock is not currently held by a member, `get()` will return `undefined`.
   *
   * @param id A unique identifier which specifies the lock to query.
   */
  get(id: string): Lock | undefined {
    const locks = this.locks.get(id);
    if (!locks) return;
    for (const lock of locks.values()) {
      if (lock.status === 'locked') {
        // Return a copy instead of a reference to prevent mutations
        return { ...lock };
      }
    }
  }

  // This will be async in the future, when pending requests are no longer processed
  // in the library.
  /**
   * Retrieve all locks that are currently held in a one-off call. This is a local call that retrieves the latest locks retained in memory by the SDK.
   *
   * The following is an example of retrieving an array of all currently held locks:
   *
   * ```javascript
   * const allLocks = await space.locks.getAll();
   * ```
   */
  async getAll(): Promise<Lock[]> {
    const allLocks: Lock[] = [];

    for (const locks of this.locks.values()) {
      for (const lock of locks.values()) {
        if (lock.status === 'locked') {
          // Return a copy instead of a reference to prevent mutations
          allLocks.push({ ...lock });
        }
      }
    }

    return allLocks;
  }

  /**
   * Retrieve all locks that are currently held by the current member in a one-off call. This is a local call that retrieves the latest locks retained in memory by the SDK.
   *
   * The following is an example of retrieving all locks held by the member:
   *
   * ```javascript
   * const locks = await space.locks.getSelf();
   * ```
   */
  async getSelf(): Promise<Lock[]> {
    const self = await this.space.members.getSelf();

    if (!self) return [];

    return this.getLocksForConnectionId(self.connectionId).filter((lock) => lock.status === 'locked');
  }

  /**
   * Retrieve all locks that are currently held by members except the member itself, in a one-off call. This is a local call that retrieves the latest locks retained in memory by the SDK.
   *
   * The following is an example of retrieving all locks held by other members:
   *
   * ```javascript
   * const locks = await space.locks.getOthers();
   * ```
   */
  async getOthers(): Promise<Lock[]> {
    const self = await this.space.members.getSelf();
    const allLocks = await this.getAll();

    if (!self) return allLocks;

    return allLocks.filter((lock) => lock.member.connectionId !== self.connectionId);
  }

  /**
   * Attempt to acquire a lock with a given unique ID. Additional `attributes` may be passed when trying to acquire a lock that can contain a set of arbitrary key-value pairs. An example of using `attributes` is to store the component ID the lock relates to so that it can be easily updated in the UI with a visual indication of its lock status.
   *
   * A member must have been {@link Space.enter | entered } into the space to acquire a lock.
   *
   * The following is an example of attempting to acquire a lock:
   *
   * ```javascript
   * const acquireLock = await space.locks.acquire(id);
   * ```
   *
   * The following is an example of passing a set of `attributes` when trying to acquire a lock:
   *
   * ```javascript
   * const lockAttributes = { 'component': 'cell-d3' };
   * const acquireLock = await space.locks.acquire(id, { lockAttributes });
   * ```
   *
   * Once a member requests a lock by calling `acquire()`, the lock is temporarily in the {@link LockStatuses.Pending | pending state }. An event will be emitted based on whether the lock request was successful (a status of {@link LockStatuses.Locked | `locked`}), or invalidated (a status of {@link LockStatuses.Unlocked | `unlocked`}).
   *
   * An error will be thrown if a lock request with a status of {@link LockStatuses.Pending | `pending`} or {@link LockStatuses.Locked | `locked`} already exists, returning a rejected promise.
   *
   * @param id A unique identifier which specifies the lock to acquire.
   * @param opts An object whose {@link LockOptions.attributes | `attributes`} property specifies additional metadata to associate with the lock.
   */
  async acquire(id: string, opts?: LockOptions): Promise<Lock> {
    const self = await this.space.members.getSelf();
    if (!self) {
      throw ERR_NOT_ENTERED_SPACE();
    }

    // check there isn't an existing PENDING or LOCKED request for the current
    // member, since we do not support nested locks
    let lock = this.getLock(id, self.connectionId);
    if (lock && lock.status !== 'unlocked') {
      throw ERR_LOCK_REQUEST_EXISTS();
    }

    // initialise a new PENDING request
    lock = {
      id,
      status: 'pending',
      timestamp: Date.now(),
      member: self,
    };

    if (opts) {
      lock.attributes = opts.attributes;
    }

    this.setLock(lock);

    // reflect the change in the member's presence data
    await this.updatePresence(self);

    return lock;
  }

  /**
   * Release a lock once a member has finished editing the related component. For example, call `release()` once a user clicks outside of the component, such as clicking on another cell within a spreadsheet. Any UI indications that the previous cell was locked can then be cleared.
   *
   * The following is an example of releasing a lock:
   *
   * ```javascript
   * await space.locks.release(id);
   * ```
   * Releasing a lock will emit a lock event with an {@link LockStatuses.Unlocked | `unlocked `} status.
   *
   * > **Note**
   * >
   * > When a member is {@link MembersEventMap.remove | removed } from a space, their locks are automatically released.
   *
   * @param id A unique identifier which specifies the lock to release.
   */
  async release(id: string): Promise<void> {
    const self = await this.space.members.getSelf();

    if (!self) {
      throw ERR_NOT_ENTERED_SPACE();
    }

    const lock = this.getLock(id, self.connectionId);
    if (!lock) return;

    this.setLock({ ...lock, status: 'unlocked', reason: undefined });
    // Send presence update with the updated lock, but delete afterwards so when the
    // message is processed an update event is fired
    this.updatePresence(self);
    this.deleteLock(id, self.connectionId);
  }

  /**
   * {@label WITH_EVENTS}
   * Subscribe to lock events by registering a listener. Lock events are emitted whenever the {@link LockStatuses | lock state } transitions into `locked` or `unlocked`.
   *
   * All lock events are `update` events. When a lock event is received, UI components can be updated to add and remove visual indications of which member is locking them, as well as enabling and disabling the ability for other members to edit them.
   *
   * The following is an example of subscribing to lock events:
   *
   * ```javascript
   * space.locks.subscribe('update', (lock) => {
   *   console.log(lock);
   * });
   * ```
   *
   * @param eventOrEvents An event name, or an array of event names.
   * @param listener An event listener.
   *
   * @typeParam K A type which allows one or more names of the properties of the {@link LocksEventMap} type.
   */
  subscribe<K extends keyof LocksEventMap>(eventOrEvents: K | K[], listener?: EventListener<LocksEventMap, K>): void;
  /**
   *  Subscribe to lock updates by registering a listener for all events.
   *
   * @param listener An event listener.
   */
  subscribe(listener?: EventListener<LocksEventMap, keyof LocksEventMap>): void;
  subscribe<K extends keyof LocksEventMap>(
    listenerOrEvents?: K | K[] | EventListener<LocksEventMap, K>,
    listener?: EventListener<LocksEventMap, K>,
  ) {
    try {
      super.on(listenerOrEvents, listener);
    } catch (e: unknown) {
      if (e instanceof InvalidArgumentError) {
        throw new InvalidArgumentError(
          'Locks.subscribe(): Invalid arguments: ' + inspect([listenerOrEvents, listener]),
        );
      } else {
        throw e;
      }
    }
  }

  /**
   * {@label WITH_EVENTS}
   *
   * Unsubscribe from lock events to remove previously registered listeners.
   *
   * The following is an example of removing a listener for lock update events:
   *
   * ```javascript
   * space.locks.unsubscribe('update', listener);
   * ```
   *
   * @param eventOrEvents An event name, or an array of event names.
   * @param listener An event listener.
   *
   * @typeParam K A type which allows one or more names of the properties of the {@link LocksEventMap} type.
   */
  unsubscribe<K extends keyof LocksEventMap>(eventOrEvents: K | K[], listener?: EventListener<LocksEventMap, K>): void;
  /**
   * Unsubscribe from all events to remove previously registered listeners.
   *
   * The following is an example of removing a listener for all events:
   *
   * ```javascript
   * space.locks.unsubscribe(listener);
   * ```
   *
   * @param listener An event listener.
   */
  unsubscribe(listener?: EventListener<LocksEventMap, keyof LocksEventMap>): void;
  unsubscribe<K extends keyof LocksEventMap>(
    listenerOrEvents?: K | K[] | EventListener<LocksEventMap, K>,
    listener?: EventListener<LocksEventMap, K>,
  ) {
    try {
      super.off(listenerOrEvents, listener);
    } catch (e: unknown) {
      if (e instanceof InvalidArgumentError) {
        throw new InvalidArgumentError(
          'Locks.unsubscribe(): Invalid arguments: ' + inspect([listenerOrEvents, listener]),
        );
      } else {
        throw e;
      }
    }
  }

  /** @internal */
  async processPresenceMessage(message: PresenceMessage) {
    const member = await this.space.members.getByConnectionId(message.connectionId);
    if (!member) return;

    if (message.action === 'leave' || !Array.isArray(message?.extras?.locks)) {
      // the member has left, or they have no locks in presence, so release any
      // existing locks for that member
      for (const locks of this.locks.values()) {
        const lock = locks.get(member.connectionId);

        if (lock) {
          const updatedLock = { ...lock, status: 'unlocked' as const, reason: undefined };
          this.setLock(updatedLock);
          this.emit('update', updatedLock);
          locks.delete(member.connectionId);
        }
      }

      return;
    }

    message.extras.locks.forEach((lock: Lock) => {
      const existing = this.getLock(lock.id, member.connectionId);

      // special-case the handling of PENDING requests, which will eventually
      // be done by the Ably system, at which point this can be removed
      if (lock.status === 'pending' && (!existing || existing.status === 'pending')) {
        this.processPending(member, lock);
      }

      if (!existing || existing.status !== lock.status) {
        this.emit('update', { ...lock, member });
      }

      // TODO this lock that comes from the PresenceMessage has no type checking
      this.setLock({ ...lock, member });
    });

    // handle locks which have been unlocked and longer need to be held locally
    for (const locks of this.locks.values()) {
      for (const lock of locks.values()) {
        if (lock.status === 'unlocked') {
          this.deleteLock(lock.id, lock.member.connectionId);
        }
      }
    }
  }

  // process a PENDING lock request by determining whether it should be
  // considered LOCKED or UNLOCKED with a reason, potentially invalidating
  // existing LOCKED requests.
  //
  // TODO: remove this once the Ably system processes PENDING requests
  //       internally using this same logic.
  private processPending(member: SpaceMember, pendingLock: Lock) {
    // if the requested lock ID is not currently locked, then mark the PENDING
    // lock request as LOCKED
    const lock = this.get(pendingLock.id);
    if (!lock) {
      pendingLock.status = 'locked';
      return;
    }

    // check if the PENDING lock should invalidate the existing LOCKED request.
    //
    // This is necessary because presence data is eventually consistent, so
    // there's no guarantee that all members see presence messages in the same
    // order, which could lead to members not agreeing which members hold which
    // locks.
    //
    // For example, if two members both request the same lock at roughly the
    // same time, and both members see their own request in presence before
    // seeing the other's request, then they will each consider themselves to
    // hold the lock.
    //
    // To minimise the impact of this propagation issue, a further check is
    // made allowing a PENDING request to invalidate an existing LOCKED request
    // if the PENDING request has a timestamp which predates the LOCKED
    // request, or, if the timestamps are the same, if the PENDING request has
    // a connectionId which sorts lexicographically before the connectionId of
    // the LOCKED request.
    if (
      pendingLock.timestamp < lock.timestamp ||
      (pendingLock.timestamp == lock.timestamp && member.connectionId < lock.member.connectionId)
    ) {
      pendingLock.status = 'locked';
      const updatedLock = { ...lock, status: 'unlocked' as const, reason: ERR_LOCK_INVALIDATED() };
      this.setLock(updatedLock);
      this.emit('update', updatedLock);
      return;
    }

    // the lock is LOCKED and the PENDING request did not invalidate it, so
    // mark the PENDING request as UNLOCKED with a reason.
    pendingLock.status = 'unlocked';
    pendingLock.reason = ERR_LOCK_IS_LOCKED();
  }

  private updatePresence(self: SpaceMember) {
    const update = new SpaceUpdate({ self, extras: this.getLockExtras(self.connectionId) });
    return this.presenceUpdate(update.noop());
  }

  /** @internal */
  getLock(id: string, connectionId: string): Lock | undefined {
    const locks = this.locks.get(id);
    if (!locks) return;
    return locks.get(connectionId);
  }

  private setLock(lock: Lock) {
    let locks = this.locks.get(lock.id);
    if (!locks) {
      locks = new Map();
      this.locks.set(lock.id, locks);
    }
    locks.set(lock.member.connectionId, lock);
  }

  private deleteLock(id: string, connectionId: string) {
    const locks = this.locks.get(id);
    if (!locks) return;
    return locks.delete(connectionId);
  }

  private getLocksForConnectionId(connectionId: string): Lock[] {
    const requests: Lock[] = [];

    for (const locks of this.locks.values()) {
      const lock = locks.get(connectionId);

      if (lock) {
        requests.push({ ...lock });
      }
    }

    return requests;
  }

  /** @internal */
  getLockExtras(connectionId: string): PresenceMember['extras'] {
    const locks = this.getLocksForConnectionId(connectionId);
    if (locks.length === 0) return;
    return { locks };
  }
}
