import { SpaceMember } from "../Space";

export class SpaceMemberUpdateEvent extends Event {
  constructor(public members: SpaceMember[]) {
    super('memberUpdate', {});
  }
}
