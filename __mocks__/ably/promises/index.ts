import Ably, { Types } from 'ably/promises';

const MOCK_CLIENT_ID = 'MOCK_CLIENT_ID';

const mockPromisify = <T>(expectedReturnValue): Promise<T> => new Promise((resolve) => resolve(expectedReturnValue));
const methodReturningVoidPromise = () => mockPromisify<void>((() => {})());

function createMockPresence() {
  return {
    get: () => mockPromisify<Types.PresenceMessage[]>([]),
    update: () => mockPromisify<void>(undefined),
    enter: methodReturningVoidPromise,
    leave: methodReturningVoidPromise,
    subscriptions: {
      once: (_: unknown, fn: Function) => {
        fn();
      },
    },
    subscribe: () => {},
    unsubscribe: () => {},
  };
}

function createMockHistory() {
  const mockHistory = {
    items: [],
    first: () => mockPromisify(mockHistory),
    next: () => mockPromisify(mockHistory),
    current: () => mockPromisify(mockHistory),
    hasNext: () => false,
    isLast: () => true,
  };
  return mockHistory;
}

function createMockEmitter() {
  return {
    any: [],
    events: {},
    anyOnce: [],
    eventsOnce: {},
  };
}

function createMockChannel() {
  return {
    presence: createMockPresence(),
    history: (() => {
      const mockHistory = createMockHistory();
      return () => mockHistory;
    })(),
    subscribe: () => {},
    publish: () => {},
    subscriptions: createMockEmitter(),
  };
}

class MockRealtime {
  public channels: {
    get: () => ReturnType<typeof createMockChannel>;
  };
  public auth: {
    clientId: string;
  };
  public connection: {
    id?: string;
    state: string;
  };

  public time() {}

  constructor() {
    this.channels = {
      get: (() => {
        const mockChannel = createMockChannel();
        return () => mockChannel;
      })(),
    };
    this.auth = {
      clientId: MOCK_CLIENT_ID,
    };
    this.connection = {
      id: '1',
      state: 'connected',
    };

    this['options'] = {};
  }
}

// maintain the PresenceMessage class so tests can initialise it directly using
// PresenceMessage.fromValues.
MockRealtime.PresenceMessage = Ably.Rest.PresenceMessage;

export { MockRealtime as Realtime };
