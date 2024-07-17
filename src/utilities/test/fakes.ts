import { PresenceMessage } from 'ably';

import Space from '../../Space.js';

import type { SpaceMember } from '../../types.js';
import type { PresenceMember } from '../types.js';

// import { nanoidId } from '../../../__mocks__/nanoid/index.js';
const nanoidId = 'NanoidID';

const enterPresenceMessage: PresenceMessage = {
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
  extras: {},
  action: 'enter',
  connectionId: '1',
  id: '1',
  encoding: 'json',
  timestamp: 1,
};

const updatePresenceMessage: PresenceMessage = {
  ...enterPresenceMessage,
  action: 'update',
};

const leavePresenceMessage: PresenceMessage = {
  ...enterPresenceMessage,
  action: 'leave',
};

type MessageMap = {
  enter: typeof enterPresenceMessage;
  update: typeof updatePresenceMessage;
  leave: typeof leavePresenceMessage;
};

const createPresenceMessage = <T extends keyof MessageMap>(type: T, override?: Partial<MessageMap[T]>) => {
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

const createPresenceEvent = async <T extends keyof MessageMap>(
  space: Space,
  presenceMap: Map<string, PresenceMessage>,
  type: T,
  override?: Partial<MessageMap[T]>,
) => {
  const member = createPresenceMessage(type, override);
  if (type == 'leave') {
    presenceMap.delete(member.connectionId);
  } else {
    presenceMap.set(member.connectionId, member);
  }
  await space['onPresenceUpdate'](member);
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
