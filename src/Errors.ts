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
