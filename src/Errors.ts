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

export const ERR_LOCK_REQUEST_EXISTS = new ErrorInfo({
  message: 'lock request already exists',
  code: 40050,
  statusCode: 400,
});

export const ERR_LOCK_IS_LOCKED = new ErrorInfo({
  message: 'lock is currently locked',
  code: 40051,
  statusCode: 400,
});

export const ERR_LOCK_INVALIDATED = new ErrorInfo({
  message: 'lock was invalidated by a concurrent lock request which now holds the lock',
  code: 40052,
  statusCode: 400,
});
