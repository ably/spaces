const TEST_DEFAULT_CLIENT_ID = 'RND-CLIENTID';

const TEST_ENTER_PRESENCE_TIMESTAMP = 1675699722722;

const authAction = (override) => {
  return {
    action: 4,
    connectionId: 'CONNDESC',
    connectionKey: 'CONNECTIONKEY',
    connectionSerial: -1,
    connectionDetails: {
      clientId: TEST_DEFAULT_CLIENT_ID,
      connectionKey: 'randomKey',
      maxMessageSize: 131000,
      maxInboundRate: 1000,
      maxOutboundRate: 1000,
      maxFrameSize: 262144,
      connectionStateTtl: 120000,
      maxIdleInterval: 15000,
    },
    ...override,
  };
};

const createChannelAction = (override) => {
  return {
    action: 11,
    flags: 983041,
    channel: 'foo',
    channelSerial: '108eMNtswBL6Ud51959078:-1',
    ...override,
  };
};

const getPresenceAction = (override) => {
  return {
    action: 16,
    channel: 'foo',
    channelSerial: '108rUpQvABKxWa69183736:',
    presence: [],
    ...override,
  };
};

const enterPresenceAction = (override) => {
  return {
    action: 14,
    id: 'NU_ExvNktu:0',
    connectionId: 'NU_ExvNktu',
    connectionSerial: 0,
    channel: 'foo',
    channelSerial: '108eMNtswBL6Ud51959078:3',
    timestamp: TEST_ENTER_PRESENCE_TIMESTAMP,
    presence: [
      {
        id: 'NU_ExvNktu:0:0',
        clientId: TEST_DEFAULT_CLIENT_ID,
        connectionId: 'NU_ExvNktu',
        timestamp: TEST_ENTER_PRESENCE_TIMESTAMP,
        encoding: 'json',
        data: '',
        action: 2,
      },
    ],
    ...override,
  };
};

export { enterPresenceAction, getPresenceAction, createChannelAction, authAction, TEST_DEFAULT_CLIENT_ID, TEST_ENTER_PRESENCE_TIMESTAMP };
