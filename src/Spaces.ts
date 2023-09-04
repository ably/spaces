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
  client: Types.RealtimePromise;
  connection: Types.ConnectionPromise;

  readonly version = '0.1.0';

  constructor(client: Types.RealtimePromise) {
    this.client = client;
    this.connection = client.connection;
    this.addAgent((this.client as ClientWithOptions)['options']);
    this.client.time();
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

    if (this.connection.state !== 'connected') {
      await this.connection.once('connected');
    }

    const space = new Space(name, this.client, options);
    this.spaces[name] = space;

    return space;
  }
}

export default Spaces;
