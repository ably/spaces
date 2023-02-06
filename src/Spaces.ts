import { Types } from "ably";
import SpaceOptions from "./Options/SpaceOptions";
import Space from './Space';
class Spaces {
  private spaces: Record<string, Space>;
  private channel: Types.RealtimeChannelPromise;

  constructor(
    private ably: Types.RealtimePromise
  ){
    this.spaces = {};
    this.ably = ably;
    // The channel name prefix here should be unique to avoid conflicts with non-space channels
    this.channel = ably.channels.get(`_ably_space_${name}`);
  }

  get(name: string, options: SpaceOptions): Space {
    if (typeof name !== 'string' || name.length === 0) {
      throw new Error('Spaces must have a non-empty name');
    }

    if (this.spaces[name]) return this.spaces[name];

    const space = new Space(name, options, this.channel, this.ably.auth.clientId);
    this.spaces[name] = space;
    return space;
  }

}

export default Spaces;
