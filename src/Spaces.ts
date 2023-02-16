import { Types, Realtime } from 'ably';
import SpaceOptions from './options/SpaceOptions';
import Space from './Space';
class Spaces {
  private spaces: Record<string, Space>;
  private channel: Types.RealtimeChannelPromise;
  ably: Types.RealtimePromise;

  readonly version = '0.0.1';

  constructor(optionsOrAbly: Types.RealtimePromise | Types.ClientOptions | string) {
    this.spaces = {};
    if (optionsOrAbly instanceof Realtime) {
      this.ably = optionsOrAbly as Types.RealtimePromise;
      this.addAgent(this.ably['options']);
    } else {
      let options: any = typeof optionsOrAbly === 'string' ? { key: optionsOrAbly } : optionsOrAbly;
      this.addAgent(options);
      this.ably = new Realtime.Promise(options);
    }
  }

  private addAgent(options: any) {
    const agent = `ably-spaces/${this.version}`;
    if (!options.agents) {
      options.agents = [agent];
    } else if (!options.agents.includes(agent)) {
      options.agents.push(agent);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
  get(name: string, options?: SpaceOptions): Space {
    if (typeof name !== 'string' || name.length === 0) {
      throw new Error('Spaces must have a non-empty name');
    }

    if (this.spaces[name]) return this.spaces[name];

    const space = new Space(name, this.ably, options);
    this.spaces[name] = space;
    return space;
  }
}

export default Spaces;
