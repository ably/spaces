import { Types } from 'ably';

import { EventKey, EventListener, EventMap } from './EventEmitter.js';
import { ProfileData } from '../types.js';

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
} & Omit<Types.PresenceMessage, 'data'>;

export type Subset<K> = {
  [attr in keyof K]?: K[attr] extends object ? Subset<K[attr]> : K[attr];
};

export interface Provider<ProviderEventMap extends EventMap> {
  subscribe<K extends EventKey<ProviderEventMap>>(
    listenerOrEvents?: K | K[] | EventListener<ProviderEventMap[K]>,
    listener?: EventListener<ProviderEventMap[K]>,
  );

  unsubscribe<K extends EventKey<ProviderEventMap>>(
    listenerOrEvents?: K | K[] | EventListener<ProviderEventMap[K]>,
    listener?: EventListener<ProviderEventMap[K]>,
  );
}

export type RealtimeMessage = Omit<Types.Message, 'connectionId'> & {
  connectionId: string;
};
