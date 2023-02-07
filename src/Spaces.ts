import { Types } from 'ably';
import SpaceOptions from './options/SpaceOptions';
import Space from './Space';

class Spaces {
  private spaces: Record<string, Space>;
  private channel: Types.RealtimeChannelPromise;

  constructor(public client: Types.RealtimePromise) {
    this.spaces = {};
  }

  get(name: string, options?: SpaceOptions): Space {
    if (typeof name !== 'string' || name.length === 0) {
      throw new Error('Spaces must have a non-empty name');
    }

    if (this.spaces[name]) return this.spaces[name];

    const space = new Space(name, this.client, options);
    this.spaces[name] = space;
    return space;
  }
}

export default Spaces;
