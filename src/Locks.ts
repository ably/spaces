import { Types } from 'ably';

import Space from './Space.js';
import type { Lock, SpaceMember } from './types.js';
import type { PresenceMember } from './utilities/types.js';
import { ERR_LOCK_IS_LOCKED, ERR_LOCK_INVALIDATED, ERR_LOCK_REQUEST_EXISTS, ERR_NOT_ENTERED_SPACE } from './Errors.js';
import EventEmitter, {
  InvalidArgumentError,
  inspect,
  type EventKey,
  type EventListener,
} from './utilities/EventEmitter.js';

export class LockAttributes extends Map<string, string> {
  toJSON() {
    return Object.fromEntries(this);
  }
}

interface LockOptions {
  attributes: LockAttributes;
}

type LockEventMap = {
  update: Lock;
};

export default class Locks extends EventEmitter<LockEventMap> {
  // locks tracks the local state of locks, which is used to determine whether
  // a lock's status has changed when processing presence updates.
  //
  // The top-level map keys are lock identifiers, the second-level map keys are
  // member connectionIds, and the values are the state of locks those members
  // have requested.
  private locks: Map<string, Map<string, Lock>>;

  constructor(
    private space: Space,
    private presenceUpdate: (update: PresenceMember['data'], extras?: any) => Promise<void>,
  ) {
    super();
    this.locks = new Map();
  }

  get(id: string): Lock | undefined {
    const locks = this.locks.get(id);
    if (!locks) return;
    for (const lock of locks.values()) {
      if (lock.status === 'locked') {
        return lock;
      }
    }
  }

  // This will be async in the future, when pending requests are no longer processed
  // in the library.
  async getAll(): Promise<Lock[]> {
    const allLocks: Lock[] = [];

    for (const locks of this.locks.values()) {
      for (const lock of locks.values()) {
        if (lock.status === 'locked') {
          allLocks.push(lock);
        }
      }
    }

    return allLocks;
  }

  async getSelf(): Promise<Lock[]> {
    const self = await this.space.members.getSelf();

    if (!self) return [];

    return this.getLocksForConnectionId(self.connectionId).filter((lock) => lock.status === 'locked');
  }

  async getOthers(): Promise<Lock[]> {
    const self = await this.space.members.getSelf();
    const allLocks = await this.getAll();

    if (!self) return allLocks;

    return allLocks.filter((lock) => lock.member.connectionId !== self.connectionId);
  }

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

  async release(id: string): Promise<void> {
    const self = await this.space.members.getSelf();

    if (!self) {
      throw ERR_NOT_ENTERED_SPACE();
    }

    const lock = this.getLock(id, self.connectionId);
    if (!lock) return;

    lock.status = 'unlocked';
    lock.reason = undefined;
    // Send presence update with the updated lock, but delete afterwards so when the
    // message is processed an update event is fired
    this.updatePresence(self);
    this.deleteLock(id, self.connectionId);
  }

  subscribe<K extends EventKey<LockEventMap>>(
    listenerOrEvents?: K | K[] | EventListener<LockEventMap[K]>,
    listener?: EventListener<LockEventMap[K]>,
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

  unsubscribe<K extends EventKey<LockEventMap>>(
    listenerOrEvents?: K | K[] | EventListener<LockEventMap[K]>,
    listener?: EventListener<LockEventMap[K]>,
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

  async processPresenceMessage(message: Types.PresenceMessage) {
    const member = await this.space.members.getByConnectionId(message.connectionId);
    if (!member) return;

    if (message.action === 'leave' || !Array.isArray(message?.extras?.locks)) {
      // the member has left, or they have no locks in presence, so release any
      // existing locks for that member
      for (const locks of this.locks.values()) {
        const lock = locks.get(member.connectionId);

        if (lock) {
          lock.status = 'unlocked';
          lock.reason = undefined;
          this.emit('update', lock);
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
  processPending(member: SpaceMember, pendingLock: Lock) {
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
      lock.status = 'unlocked';
      lock.reason = ERR_LOCK_INVALIDATED();
      this.emit('update', lock);
      return;
    }

    // the lock is LOCKED and the PENDING request did not invalidate it, so
    // mark the PENDING request as UNLOCKED with a reason.
    pendingLock.status = 'unlocked';
    pendingLock.reason = ERR_LOCK_IS_LOCKED();
  }

  updatePresence(member: SpaceMember) {
    const update: PresenceMember['data'] = {
      profileUpdate: {
        id: null,
        current: member.profileData,
      },
      locationUpdate: {
        id: null,
        current: member?.location ?? null,
        previous: null,
      },
    };
    return this.presenceUpdate(update, this.getLockExtras(member.connectionId));
  }

  getLock(id: string, connectionId: string): Lock | undefined {
    const locks = this.locks.get(id);
    if (!locks) return;
    return locks.get(connectionId);
  }

  setLock(lock: Lock) {
    let locks = this.locks.get(lock.id);
    if (!locks) {
      locks = new Map();
      this.locks.set(lock.id, locks);
    }
    locks.set(lock.member.connectionId, lock);
  }

  deleteLock(id: string, connectionId: string) {
    const locks = this.locks.get(id);
    if (!locks) return;
    return locks.delete(connectionId);
  }

  getLocksForConnectionId(connectionId: string): Lock[] {
    const requests: Lock[] = [];

    for (const locks of this.locks.values()) {
      const lock = locks.get(connectionId);

      if (lock) {
        requests.push(lock);
      }
    }

    return requests;
  }

  getLockExtras(connectionId: string): PresenceMember['extras'] {
    const locks = this.getLocksForConnectionId(connectionId);
    if (locks.length === 0) return;
    return { locks };
  }
}
