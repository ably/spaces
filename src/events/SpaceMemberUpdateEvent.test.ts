import { expect, describe, it } from 'vitest';
import { SpaceMember } from '../Space';
import { TEST_DEFAULT_CLIENT_ID } from '../utilities/test/mock-server-action-responses';
import { SpaceMemberUpdateEvent } from './SpaceMemberUpdateEvent';

const TEST_EMPTY_MEMBER_MESSAGE: SpaceMember = {
  clientId: TEST_DEFAULT_CLIENT_ID,
  isConnected: false,
  data: {}
};

describe('SpaceMemberUpdateEvent', () => {
  it('Contains a set of members', () => {
    const spaceMemberUpdateEvent = new SpaceMemberUpdateEvent([TEST_EMPTY_MEMBER_MESSAGE]);
    expect(spaceMemberUpdateEvent.members).toEqual([TEST_EMPTY_MEMBER_MESSAGE]);
  })
});
