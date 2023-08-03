import type { SpaceMember } from '../../types.js';
import type { PresenceMember } from '../../utilities/types.js';

// import { nanoidId } from '../../../__mocks__/nanoid/index.js';
const nanoidId = 'NanoidID';

const enterPresenceMessage = {
  clientId: '1',
  data: {
    profileUpdate: {
      id: null,
      current: null,
    },
    locationUpdate: {
      id: null,
      current: null,
      previous: null,
    },
  },
  action: 'enter',
  connectionId: '1',
  id: '1',
  encoding: 'json',
  timestamp: 1,
};

const updatePresenceMessage = {
  ...enterPresenceMessage,
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
  space['onPresenceUpdate'](createPresenceMessage(type, override));
};

const createLocationUpdate = (update?: Partial<PresenceMember['data']['locationUpdate']>): PresenceMember['data'] => {
  return {
    locationUpdate: {
      current: null,
      id: nanoidId,
      previous: null,
      ...update,
    },
    profileUpdate: {
      current: null,
      id: null,
    },
  };
};

const createProfileUpdate = (update?: Partial<PresenceMember['data']['profileUpdate']>): PresenceMember['data'] => {
  return {
    locationUpdate: {
      current: null,
      id: null,
      previous: null,
    },
    profileUpdate: {
      current: null,
      id: nanoidId,
      ...update,
    },
  };
};

const createSpaceMember = (override?: Partial<SpaceMember>): SpaceMember => {
  return {
    clientId: '1',
    connectionId: '1',
    isConnected: true,
    profileData: null,
    location: null,
    lastEvent: { name: 'update', timestamp: 1 },
    ...override,
  };
};

export { createPresenceMessage, createPresenceEvent, createSpaceMember, createLocationUpdate, createProfileUpdate };
