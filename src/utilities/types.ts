import type { InboundMessage, PresenceMessage } from 'ably';

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
} & Omit<PresenceMessage, 'data'>;

/**
 * Given an object type `T`, `Subset<T>` represents an object which has the same shape as `T`, but with some keys (at any level of nesting) potentially absent.
 *
 * @typeParam T The type from which `Subset` is derived.
 */
export type Subset<T> = {
  [attr in keyof T]?: T[attr] extends object ? Subset<T[attr]> : T[attr];
};

export type RealtimeInboundMessage = Omit<InboundMessage, 'clientId' | 'connectionId'> & {
  clientId: string;
  connectionId: string;
};
