const mockPromisify = <T>(expectedReturnValue: T): Promise<T> => new Promise((resolve) => resolve(expectedReturnValue));

const enterPresenceMessage = {
  clientId: '1',
  data: { profileData: {} },
  action: 'enter',
  connectionId: '1',
  id: '1',
  encoding: 'json',
  timestamp: 1,
};

const updatePresenceMessage = {
  ...enterPresenceMessage,
  data: { profileData: { a: 1 } },
  action: 'update',
};

const leavePresenceMessage = {
  ...enterPresenceMessage,
  action: 'leave',
};

const createPresenceMessage = (type, override?) => {
  switch (type) {
    case 'enter':
      return { ...enterPresenceMessage, ...override };
    case 'update':
      return { ...updatePresenceMessage, ...override };
    case 'leave':
      return { ...leavePresenceMessage, ...override };
    default:
      throw new Error(`Invalid test event type argument: ${type}`);
  }
};

const createPresenceEvent = (space, type, override?) => {
  space.onPresenceUpdate(createPresenceMessage(type, override));
};

const clientConnection = {
  id: '1',
  ping: () => mockPromisify<number>(100),
  whenState: () =>
    mockPromisify<{
      current: 'connected';
      previous: 'disconnected';
    }>({
      current: 'connected',
      previous: 'disconnected',
    }),
  errorReason: {
    code: 20000,
    message: '',
    statusCode: 200,
  },
  recoveryKey: ``,
  serial: 1,
  state: `connected`,
  close: () => mockPromisify(undefined),
  on: () => mockPromisify(undefined),
  off: () => mockPromisify(undefined),
  connect: () => mockPromisify(undefined),
  once: () =>
    mockPromisify<{
      current: 'connected';
      previous: 'disconnected';
    }>({
      current: 'connected',
      previous: 'disconnected',
    }),
  listeners: () => [],
} as const;

export { createPresenceMessage, createPresenceEvent, clientConnection };
