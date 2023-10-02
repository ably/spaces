import { ErrorInfo } from 'ably';

export const ERR_SPACE_NAME_MISSING = () => new ErrorInfo('must have a non-empty name for the space', 101000, 400);

export const ERR_NOT_ENTERED_SPACE = () => new ErrorInfo('must enter a space to perform this operation', 101001, 400);

export const ERR_LOCK_REQUEST_EXISTS = () => new ErrorInfo('lock request already exists', 101002, 400);

export const ERR_LOCK_IS_LOCKED = () => new ErrorInfo('lock is currently locked', 101003, 400);

export const ERR_LOCK_INVALIDATED = () =>
  new ErrorInfo('lock was invalidated by a concurrent lock request which now holds the lock', 101004, 400);
