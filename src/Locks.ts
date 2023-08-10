import { Types } from 'ably';

import Space from './Space.js';
import type { SpaceMember } from './types.js';
import type { PresenceMember } from './utilities/types.js';
import { ERR_LOCK_IS_LOCKED, ERR_LOCK_INVALIDATED, ERR_LOCK_REQUEST_EXISTS, ERR_LOCK_RELEASED } from './Errors.js';
import EventEmitter, {
  InvalidArgumentError,
  inspect,
  type EventKey,
  type EventListener,
} from './utilities/EventEmitter.js';

export type LockStatus = 'pending' | 'locked' | 'unlocked';

export type Lock = {
  member: SpaceMember;
  request: LockRequest;
};

export type LockRequest = {
  id: string;
  status: LockStatus;
  timestamp: number;
  attributes?: Map<string, string>;
  reason?: Types.ErrorInfo;
};

interface LockOptions {
  attributes: Map<string, string>;
}

type LockEventMap = {
  update: Lock;
};

export default class Locks extends EventEmitter<LockEventMap> {
  constructor(
    private space: Space,
    private presenceUpdate: (update: PresenceMember['data'], extras?: any) => Promise<void>,
  ) {
    super();
  }

  get(id: string): Lock | undefined {
    for (const member of this.space.members.getAll()) {
      const request = member.locks.get(id);
      if (request && request.status === 'locked') {
        return { request, member };
      }
    }
  }

  async acquire(id: string, opts?: LockOptions): Promise<LockRequest> {
    const self = this.space.members.getSelf();
    if (!self) {
      throw new Error('Must enter a space before acquiring a lock');
    }

    // check there isn't an existing PENDING or LOCKED request for the current
    // member, since we do not support nested locks
    let req = self.locks.get(id);
    if (req && req.status !== 'unlocked') {
      throw ERR_LOCK_REQUEST_EXISTS;
    }

    // initialise a new PENDING request
    req = {
      id,
      status: 'pending',
      timestamp: Date.now(),
    };
    if (opts) {
      req.attributes = opts.attributes;
    }
    self.locks.set(id, req);

    // reflect the change in the member's presence data
    await this.updatePresence(self);

    return req;
  }

  async release(id: string): Promise<void> {
    const self = this.space.members.getSelf();
    if (!self) {
      throw new Error('Must enter a space before acquiring a lock');
    }

    self.locks.delete(id);

    await this.updatePresence(self);
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

  processPresenceMessage(message: Types.PresenceMessage) {
    const member = this.space.members.getByConnectionId(message.connectionId);
    if (!member) {
      return;
    }

    if (!message.extras || !message.extras.locks || !Array.isArray(message.extras.locks)) {
      // there are no locks in presence, so release any existing locks for the
      // member
      for (const [id, lock] of member.locks.entries()) {
        lock.status = 'unlocked';
        lock.reason = ERR_LOCK_RELEASED;
        member.locks.delete(id);
        this.emit('update', { member, request: lock });
      }
      return;
    }

    message.extras.locks.forEach((lock: LockRequest) => {
      // special-case the handling of PENDING requests, which will eventually
      // be done by the Ably system, at which point this can be removed
      if (lock.status === 'pending') {
        this.processPending(member, lock);
      }

      const existing = member.locks.get(lock.id);
      if (!existing || existing.status !== lock.status) {
        this.emit('update', { member, request: lock });
      }

      member.locks.set(lock.id, lock);
    });

    // handle locks which have been removed from presence extras
    for (const [id, lock] of member.locks.entries()) {
      if (!message.extras.locks.some((req: LockRequest) => req.id === id)) {
        lock.status = 'unlocked';
        lock.reason = ERR_LOCK_RELEASED;
        member.locks.delete(id);
        this.emit('update', { member, request: lock });
      }
    }
  }

  // process a PENDING lock request by determining whether it should be
  // considered LOCKED or UNLOCKED with a reason, potentially invalidating
  // existing LOCKED requests.
  //
  // TODO: remove this once the Ably system processes PENDING requests
  //       internally using this same logic.
  processPending(member: SpaceMember, pendingReq: LockRequest) {
    // if the requested lock ID is not currently locked, then mark the PENDING
    // request as LOCKED
    const lock = this.get(pendingReq.id);
    if (!lock) {
      pendingReq.status = 'locked';
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
      pendingReq.timestamp < lock.request.timestamp ||
      (pendingReq.timestamp == lock.request.timestamp && member.connectionId < lock.member.connectionId)
    ) {
      pendingReq.status = 'locked';
      lock.request.status = 'unlocked';
      lock.request.reason = ERR_LOCK_INVALIDATED;
      this.emit('update', lock);
      return;
    }

    // the lock is LOCKED and the PENDING request did not invalidate it, so
    // mark the PENDING request as UNLOCKED with a reason.
    pendingReq.status = 'unlocked';
    pendingReq.reason = ERR_LOCK_IS_LOCKED;
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
    let extras;
    if (member.locks.size > 0) {
      extras = {
        locks: Array.from(member.locks.values()),
      };
    }
    return this.presenceUpdate(update, extras);
  }
}