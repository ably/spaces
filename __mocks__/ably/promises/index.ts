import { Types } from 'ably/promises';

const MOCK_CLIENT_ID = 'MOCK_CLIENT_ID';

const mockPromisify = <T>(expectedReturnValue): Promise<T> => new Promise((resolve) => resolve(expectedReturnValue));
const methodReturningVoidPromise = () => mockPromisify<void>((() => {})());

const mockPresence = {
  get: () => mockPromisify<Types.PresenceMessage[]>([]),
  update: () => mockPromisify<void>(undefined),
  enter: methodReturningVoidPromise,
  leave: methodReturningVoidPromise,
  subscriptions: {
    once: async (_, fn) => {
      return await fn();
    },
  },
  subscribe: () => {},
};

const mockHistory = {
  items: [],
  first: () => mockPromisify(mockHistory),
  next: () => mockPromisify(mockHistory),
  current: () => mockPromisify(mockHistory),
  hasNext: () => false,
  isLast: () => true,
};

const mockEmitter = {
  any: [],
  events: {},
  anyOnce: [],
  eventsOnce: {},
};

const mockChannel = {
  presence: mockPresence,
  history: () => mockHistory,
  subscribe: () => {},
  publish: () => {},
  subscriptions: mockEmitter,
};

class MockRealtime {
  public channels: {
    get: () => typeof mockChannel;
  };
  public auth: {
    clientId: string;
  };
  public connection: {
    id?: string;
  };

  constructor() {
    this.channels = {
      get: () => mockChannel,
    };
    this.auth = {
      clientId: MOCK_CLIENT_ID,
    };
    this.connection = {
      id: '1',
    };
  }
}

export { MockRealtime as Realtime };
