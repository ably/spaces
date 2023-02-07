import { Types } from "ably";
import SpaceOptions from "./options/SpaceOptions";
import Space from './Space';
class Spaces {
  private spaces: Record<string, Space>;
  private channel: Types.RealtimeChannelPromise;
  ably: Types.RealtimePromise;

  constructor(
    ably: Types.RealtimePromise,
  ){
    this.spaces = {};
    this.ably = ably;
  }

  get(name: string, options?: SpaceOptions): Space {
    if (typeof name !== 'string' || name.length === 0) {
      throw new Error('Spaces must have a non-empty name');
    }

    if (this.spaces[name]) return this.spaces[name];

    const space = new Space(name, this.ably);
    this.spaces[name] = space;
    return space;
  }

}

export default Spaces;
