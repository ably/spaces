import type { Types } from 'ably';

import type { ProfileData, Lock } from '../types.js';

export type PresenceMember = {
  data: {
    profileUpdate: {
      id: string | null;
      current: ProfileData;
    };
    locationUpdate: {
      id: string | null;
      previous: unknown;
      current: unknown;
    };
  };
  extras?: {
    locks: Lock[];
  };
} & Omit<Types.PresenceMessage, 'data'>;

export type Subset<T> = {
  [attr in keyof T]?: T[attr] extends object ? Subset<T[attr]> : T[attr];
};

export type RealtimeMessage = Omit<Types.Message, 'connectionId'> & {
  connectionId: string;
};
