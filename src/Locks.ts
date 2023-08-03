import { Types } from 'ably';

import Space from './Space.js';
import type { PresenceMember } from './utilities/types.js';
import { ERR_LOCK_REQUEST_EXISTS } from './Errors.js';

export enum LockStatus {
  PENDING = 'pending',
  LOCKED = 'locked',
  UNLOCKED = 'unlocked',
}

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

export default class Locks {
  constructor(
    private space: Space,
    private presenceUpdate: (update: PresenceMember['data'], extras?: any) => Promise<void>,
  ) {}

  async acquire(id: string, opts?: LockOptions): Promise<LockRequest> {
    const self = this.space.members.getSelf();
    if (!self) {
      throw new Error('Must enter a space before acquiring a lock');
    }

    // check there isn't an existing PENDING or LOCKED request for the current
    // member, since we do not support nested locks
    let req = self.locks.get(id);
    if (req && req.status !== LockStatus.UNLOCKED) {
      throw ERR_LOCK_REQUEST_EXISTS;
    }

    // initialise a new PENDING request
    req = {
      id,
      status: LockStatus.PENDING,
      timestamp: Date.now(),
    };
    if (opts) {
      req.attributes = opts.attributes;
    }
    self.locks.set(id, req);

    // reflect the change in the member's presence data
    const update: PresenceMember['data'] = {
      profileUpdate: {
        id: null,
        current: self.profileData,
      },
      locationUpdate: {
        id: null,
        current: self?.location ?? null,
        previous: null,
      },
    };
    const extras = {
      locks: Array.from(self.locks.values()),
    };
    await this.presenceUpdate(update, extras);

    return req;
  }
}
