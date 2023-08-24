import { Types } from 'ably';
import { ERR_SPACE_NAME_MISSING } from './Errors.js';

import Space from './Space.js';

import type { SpaceOptions } from './types.js';
import type { Subset } from './utilities/types.js';

export interface ClientWithOptions extends Types.RealtimePromise {
  options: {
    agents?: Record<string, string | boolean>;
  };
}

class Spaces {
  private spaces: Record<string, Space> = {};
  ably: Types.RealtimePromise;

  readonly version = '0.0.13';

  constructor(client: Types.RealtimePromise) {
    this.ably = client;
    this.addAgent((this.ably as ClientWithOptions)['options']);
    this.ably.time();
  }

  private addAgent(options: { agents?: Record<string, string | boolean> }) {
    const agent = { 'ably-spaces': this.version, 'space-custom-client': true };
    options.agents = { ...(options.agents ?? options.agents), ...agent };
  }

  async get(name: string, options?: Subset<SpaceOptions>): Promise<Space> {
    if (typeof name !== 'string' || name.length === 0) {
      throw ERR_SPACE_NAME_MISSING;
    }

    if (this.spaces[name]) return this.spaces[name];

    if (this.ably.connection.state !== 'connected') {
      await this.ably.connection.once('connected');
    }

    const space = new Space(name, this.ably, options);
    this.spaces[name] = space;

    return space;
  }
}

export default Spaces;
