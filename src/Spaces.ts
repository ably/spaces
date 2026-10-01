import { PubSubRealtimeClient, Connection } from '@ably/pubsub-core';
import { ERR_SPACE_NAME_MISSING } from './Errors.js';

import Space from './Space.js';

import type { SpaceOptions } from './types.js';
import type { Subset } from './utilities/types.js';

import { VERSION } from './version.js';

export interface ClientWithOptions extends PubSubRealtimeClient {
  options: {
    agents?: Record<string, string | boolean>;
  };
}

/**
 * The `SpacesClient` is the entry point to the Spaces SDK. Use its {@link SpacesClient.get | `get()`} method to access an individual {@link Space | `Space`}.
 *
 * To create a `SpacesClient`, you first need to create an instance of an [Ably realtime client](https://ably.com/docs/getting-started/setup). You then pass this instance to {@link createSpacesClient | `createSpacesClient()`}.
 */
export interface SpacesClient {
  /**
   * Instance of the [Ably realtime client](https://ably.com/docs/getting-started/setup) client that was passed to {@link createSpacesClient | `createSpacesClient()`}.
   */
  readonly client: PubSubRealtimeClient;
  /**
   * Instance of the [Ably realtime client](https://ably.com/docs/getting-started/setup) connection, belonging to the client that was passed to {@link createSpacesClient | `createSpacesClient()`}.
   */
  readonly connection: Connection;

  /**
   * Version of the Spaces library.
   */
  readonly version: string;

  /**
   *
   * Create or retrieve an existing [space](https://ably.com/docs/spaces/space) from the `SpacesClient` collection. A space is uniquely identified by its unicode string name.
   *
   * The following is an example of creating a space:
   *
   * ```javascript
   * const space = await spaces.get('board-presentation');
   * ```
   *
   * A set of {@link SpaceOptions | options} may be passed when creating a space to customize a space.
   *
   * The following is an example of setting custom `SpaceOptions`:
   *
   * ```javascript
   * const space = await spaces.get('board-presentation', {
   * 	offlineTimeout: 180_000,
   * 	cursors: { paginationLimit: 10 }
   * });
   * ```
   *
   * @param name The name of the space to create or retrieve.
   * @param options Additional options to customize the behavior of the space.
   */
  get(name: string, options?: Subset<SpaceOptions>): Promise<Space>;
}

class DefaultSpacesClient implements SpacesClient {
  private spaces: Record<string, Space> = {};
  readonly client: PubSubRealtimeClient;
  readonly connection: Connection;
  readonly version = VERSION;

  constructor(client: PubSubRealtimeClient) {
    this.client = client;
    this.connection = client.connection;
    this.addAgent((this.client as ClientWithOptions)['options']);
    this.client.time();
  }

  private addAgent(options: { agents?: Record<string, string | boolean> }) {
    const agent = { spaces: this.version };
    options.agents = { ...(options.agents ?? options.agents), ...agent };
  }

  async get(name: string, options?: Subset<SpaceOptions>): Promise<Space> {
    if (typeof name !== 'string' || name.length === 0) {
      throw ERR_SPACE_NAME_MISSING();
    }

    if (this.connection.state !== 'connected') {
      await this.connection.once('connected');
    }

    if (this.spaces[name]) return this.spaces[name];

    const space = new Space(name, this.client, options);
    this.spaces[name] = space;

    return space;
  }
}

/**
 * Create a new instance of the Spaces SDK by passing an instance of the [Ably realtime client](https://ably.com/docs/getting-started/setup). A [`clientId`](https://ably.com/docs/auth/identified-clients) is required.
 *
 * An Ably API key is needed to authenticate. [Basic authentication](https://ably.com/docs/auth/basic) may be used for convenience, however Ably strongly recommends you use [token authentication](https://ably.com/docs/auth/token) in a production environment.
 *
 * ```javascript
 * import { createClient } from '@ably/pubsub-device';
 * import { createSpacesClient } from '@ably/spaces';
 *
 * const spaces = createSpacesClient(createClient({ key: '<API-key>', clientId: '<client-ID>' }));
 * ```
 *
 * @param client An instance of the Ably promise-based realtime client.
 */
export function createSpacesClient(client: PubSubRealtimeClient): SpacesClient {
  return new DefaultSpacesClient(client);
}
