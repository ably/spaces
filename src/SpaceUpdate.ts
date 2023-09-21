import { nanoid } from 'nanoid';
import { Types } from 'ably';

import type { SpaceMember, ProfileData } from './types.js';
import type { PresenceMember } from './utilities/types.js';

export interface SpacePresenceData {
  data: PresenceMember['data'];
  extras: PresenceMember['extras'];
}

class SpaceUpdate {
  private self: SpaceMember | null;
  private extras: Types.PresenceMessage['extras'];

  constructor({ self, extras }: { self: SpaceMember | null; extras?: Types.PresenceMessage['extras'] }) {
    this.self = self;
    this.extras = extras;
  }

  private profileUpdate(id: string | null, current: ProfileData) {
    return { id, current };
  }

  private profileNoChange() {
    return this.profileUpdate(null, this.self ? this.self.profileData : null);
  }

  private locationUpdate(id: string | null, current: SpaceMember['location'], previous: SpaceMember['location']) {
    return { id, current, previous };
  }

  private locationNoChange() {
    const location = this.self ? this.self.location : null;
    return this.locationUpdate(null, location, null);
  }

  updateProfileData(current: ProfileData): SpacePresenceData {
    return {
      data: {
        profileUpdate: this.profileUpdate(nanoid(), current),
        locationUpdate: this.locationNoChange(),
      },
      extras: this.extras,
    };
  }

  updateLocation(location: SpaceMember['location'], previousLocation?: SpaceMember['location']): SpacePresenceData {
    return {
      data: {
        profileUpdate: this.profileNoChange(),
        locationUpdate: this.locationUpdate(
          nanoid(),
          location,
          previousLocation ? previousLocation : this.self?.location,
        ),
      },
      extras: this.extras,
    };
  }

  noop(): SpacePresenceData {
    return {
      data: {
        profileUpdate: this.profileNoChange(),
        locationUpdate: this.locationNoChange(),
      },
      extras: this.extras,
    };
  }
}

export default SpaceUpdate;
