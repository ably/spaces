import { Types } from "ably";
import SpaceOptions from "./Options/SpaceOptions";
import Space from './Space';
class Spaces {
  private spaces: Record<string, Space>;

  constructor(
    private ably: Types.RealtimePromise
  ){
    this.spaces = {};
    this.ably = ably;
  }

  get(name: string, options: SpaceOptions): Space {
    if (typeof name !== 'string' || name.length === 0) {
      throw new Error('Spaces must have a non-empty name');
    }

    if (this.spaces[name]) return this.spaces[name];

    const space = new Space(name, options, this.ably);
    this.spaces[name] = space;
    return space;
  }

}

export default Spaces;
