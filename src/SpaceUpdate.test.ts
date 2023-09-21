import { describe, it, vi, expect } from 'vitest';

import SpaceUpdate from './SpaceUpdate.js';
import { createSpaceMember } from './utilities/test/fakes.js';

vi.mock('nanoid');

describe('SpaceUpdate', () => {
  it('creates a profileUpdate', () => {
    const self = createSpaceMember({ profileData: { name: 'Berry' } });
    const update = new SpaceUpdate({ self });
    expect(update.updateProfileData({ name: 'Barry' })).toEqual({
      data: {
        locationUpdate: {
          current: null,
          id: null,
          previous: null,
        },
        profileUpdate: {
          current: {
            name: 'Barry',
          },
          id: 'NanoidID',
        },
      },
      extras: undefined,
    });
  });

  it('creates a locationUpdate', () => {
    const self = createSpaceMember({ location: { slide: 3 }, profileData: { name: 'Berry' } });
    const update = new SpaceUpdate({ self });
    expect(update.updateLocation({ slide: 1 }, null)).toEqual({
      data: {
        locationUpdate: {
          current: { slide: 1 },
          id: 'NanoidID',
          previous: { slide: 3 },
        },
        profileUpdate: {
          current: {
            name: 'Berry',
          },
          id: null,
        },
      },
      extras: undefined,
    });
  });

  it('creates an object with no updates to current data', () => {
    const self = createSpaceMember({ location: { slide: 3 }, profileData: { name: 'Berry' } });
    const update = new SpaceUpdate({ self });
    expect(update.noop()).toEqual({
      data: {
        locationUpdate: {
          current: { slide: 3 },
          id: null,
          previous: null,
        },
        profileUpdate: {
          current: {
            name: 'Berry',
          },
          id: null,
        },
      },
      extras: undefined,
    });
  });
});
