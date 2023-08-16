import type { SpaceMember } from './types.js';

type SpaceLeaver = {
  member: SpaceMember;
  timeoutId: ReturnType<typeof setTimeout>;
};

class Leavers {
  private leavers: SpaceLeaver[] = [];

  constructor(private offlineTimeout: number) {}

  getByConnectionId(connectionId: string): SpaceLeaver | undefined {
    return this.leavers.find((leaver) => leaver.member.connectionId === connectionId);
  }

  getAll(): SpaceLeaver[] {
    return this.leavers;
  }

  addLeaver(member: SpaceMember, timeoutCallback: () => void) {
    // remove any existing leaver to prevent old timers from firing
    this.removeLeaver(member.connectionId);

    this.leavers.push({
      member,
      timeoutId: setTimeout(timeoutCallback, this.offlineTimeout),
    });
  }

  removeLeaver(connectionId: string) {
    const leaverIndex = this.leavers.findIndex((leaver) => leaver.member.connectionId === connectionId);

    if (leaverIndex >= 0) {
      clearTimeout(this.leavers[leaverIndex].timeoutId);
      this.leavers.splice(leaverIndex, 1);
    }
  }
}

export default Leavers;
