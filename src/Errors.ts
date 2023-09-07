interface ErrorInfoValues {
  message: string;
  code: number;
  statusCode: number;
}

// TODO: export ErrorInfo from ably-js and use that instead.
export class ErrorInfo extends Error {
  code: number;
  statusCode: number;

  constructor({ message, code, statusCode }: ErrorInfoValues) {
    super(message);

    if (typeof Object.setPrototypeOf !== 'undefined') {
      Object.setPrototypeOf(this, ErrorInfo.prototype);
    }

    this.code = code;
    this.statusCode = statusCode;
  }
}

export const ERR_SPACE_NAME_MISSING = () =>
  new ErrorInfo({
    message: 'must have a non-empty name for the space',
    code: 101000,
    statusCode: 400,
  });

export const ERR_NOT_ENTERED_SPACE = () =>
  new ErrorInfo({
    message: 'must enter a space to perform this operation',
    code: 101001,
    statusCode: 400,
  });

export const ERR_LOCK_REQUEST_EXISTS = () =>
  new ErrorInfo({
    message: 'lock request already exists',
    code: 101002,
    statusCode: 400,
  });

export const ERR_LOCK_IS_LOCKED = () =>
  new ErrorInfo({
    message: 'lock is currently locked',
    code: 101003,
    statusCode: 400,
  });

export const ERR_LOCK_INVALIDATED = () =>
  new ErrorInfo({
    message: 'lock was invalidated by a concurrent lock request which now holds the lock',
    code: 101004,
    statusCode: 400,
  });
