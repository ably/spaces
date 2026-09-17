import { ErrorInfo } from '@ably/pubsub-core';
import { PresenceMessage } from '@ably/pubsub-device';

const MOCK_CLIENT_ID = 'MOCK_CLIENT_ID';

const mockPromisify = <T>(expectedReturnValue): Promise<T> => new Promise((resolve) => resolve(expectedReturnValue));
const methodReturningVoidPromise = () => mockPromisify<void>((() => {})());

function createMockPresence() {
  return {
    get: () => mockPromisify<PresenceMessage[]>([]),
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
    unsubscribe: () => {},
    on: () => {},
    off: () => {},
    publish: () => {},
    subscriptions: createMockEmitter(),
  };
}

class MockRealtime {
  static PresenceMessage = PresenceMessage;

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

class MockErrorInfo extends ErrorInfo {}

// re-export the real PresenceMessage (which `@ably/pubsub-core` exports as a type only) so tests
// can initialise it directly using PresenceMessage.fromValues.
export { MockRealtime as DefaultPubSubRealtimeClient, MockErrorInfo as ErrorInfo, PresenceMessage };
