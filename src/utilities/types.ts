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

/**
 * @typeParam K The type from which `Subset` is derived.
 */
export type Subset<K> = {
  [attr in keyof K]?: K[attr] extends object ? Subset<K[attr]> : K[attr];
};

export type RealtimeMessage = Omit<Types.Message, 'connectionId'> & {
  connectionId: string;
};
