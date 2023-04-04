import { Types } from 'ably/promises';

export const MOCK_CLIENT_ID = 'MOCK_CLIENT_ID';

const mockPromisify = <T>(expectedReturnValue): Promise<T> => new Promise((resolve) => resolve(expectedReturnValue));
const methodReturningVoidPromise = () => mockPromisify<void>((() => {})());

const mockPresence = {
  get: () => mockPromisify<Types.PresenceMessage[]>([]),
  update: () => mockPromisify<void>(undefined),
  enter: methodReturningVoidPromise,
  leave: methodReturningVoidPromise,
  subscribe: () => {},
};

const mockChannel = {
  presence: mockPresence,
};

class MockRealtime {
  public channels: {
    get: () => typeof mockChannel;
  };
  public auth: {
    clientId: string;
  };

  constructor() {
    this.channels = {
      get: () => mockChannel,
    };
    this.auth = {
      clientId: MOCK_CLIENT_ID,
    };
  }
}

export { MockRealtime as Realtime };
