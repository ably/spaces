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

export { createPresenceMessage, createPresenceEvent };
