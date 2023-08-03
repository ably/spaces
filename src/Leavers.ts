import type Space from './Space.js';
import type { SpaceMember } from './types.js';

type SpaceLeaver = SpaceMember & {
  timeoutId: ReturnType<typeof setTimeout>;
};

class Leavers {
  private leavers: SpaceLeaver[] = [];

  constructor(private space: Space) {}

  getByConnectionId(connectionId: string): SpaceLeaver | undefined {
    return this.leavers.find((leaver) => leaver.connectionId === connectionId);
  }

  addLeaver(connectionId: string) {
    const timeoutCallback = () => {
      this.space.members.removeMember(connectionId);
    };

    const member = this.space.members.getByConnectionId(connectionId);

    if (member) {
      this.leavers.push({
        ...member,
        timeoutId: setTimeout(timeoutCallback, this.space.options.offlineTimeout),
      });
    }
  }

  removeLeaver(connectionId: string) {
    const leaverIndex = this.leavers.findIndex((leaver) => leaver.connectionId === connectionId);

    if (leaverIndex >= 0) {
      clearTimeout(this.leavers[leaverIndex].timeoutId);
      this.leavers.splice(leaverIndex, 1);
    }
  }

  refreshTimeout(connectionId: string) {
    this.removeLeaver(connectionId);
    this.addLeaver(connectionId);
  }
}

export default Leavers;
