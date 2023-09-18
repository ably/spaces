import { Types } from 'ably';
import { ERR_SPACE_NAME_MISSING } from './Errors.js';

import Space from './Space.js';

import type { SpaceOptions } from './types.js';
import type { Subset } from './utilities/types.js';

import { VERSION } from './version.js';

export interface ClientWithOptions extends Types.RealtimePromise {
  options: {
    agents?: Record<string, string | boolean>;
  };
}

class Spaces {
  private spaces: Record<string, Space> = {};
  client: Types.RealtimePromise;
  connection: Types.ConnectionPromise;

  readonly version = VERSION;

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

  /**
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/cb5de6a6a40abdcb0d9d5af825928dd62dc1ca64/content/spaces/space.textile?plain=1#L26-L39) -->
   * A @space@ object is a reference to a single space and is uniquely identified by its unicode string name. A space is created, or an existing space is retrieved from the @spaces@ collection using the @get()@ method.
   *
   * The following restrictions apply to space names:
   *
   * * Avoid starting names with @[@ or @:@
   * * Ensure names aren't empty
   * * Exclude whitespace and wildcards, such as @*@
   * * Use the correct case, whether it be uppercase or lowercase
   *
   * The following is an example of creating a space:
   *
   * ```[javascript]
   * const space = await spaces.get('board-presentation');
   * ```
   * <!-- END WEBSITE DOCUMENTATION -->
   *
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/cb5de6a6a40abdcb0d9d5af825928dd62dc1ca64/content/spaces/space.textile?plain=1#L199-L242) -->
   * h2(#advanced). Advanced properties
   *
   * The following sections are only relevant if you want to further customize a space, or understand more about the Spaces SDK. They aren't required to get up and running with the basics.
   *
   * h3(#options). Space options
   *
   * An additional set of optional properties may be passed when "creating or retrieving":#create a space to customize the behavior of different features.
   *
   * The following properties can be customized:
   *
   * |_. Property |_. Description |_. Type |
   * | offlineTimeout | Number of milliseconds after a member loses connection or closes their browser window to wait before they are removed from the member list. The default is 120,000ms (2 minutes). | Number |
   * | cursors | A "cursor options":/spaces/cursors#options object for customizing live cursor behavior. | Object |
   * | cursors.outboundBatchInterval | The interval, in milliseconds, at which a batch of cursor positions are published. This is multiplied by the number of members in a space, minus 1. The default value is 100ms. | Number |
   * | cursors.paginationLimit | The number of pages searched from history for the last published cursor position. The default is 5. | Number |
   *
   * The following is an example of customizing the space options when calling @spaces.get()@:
   *
   * ```[javascript]
   * const space = await spaces.get('board-presentation', {
   * 	offlineTimeout: 180_000,
   * 	cursors: { paginationLimit: 10 }
   * });
   * ```
   *
   * h3(#foundations). Space foundations
   *
   * The Spaces SDK is built upon existing Ably functionality available in Ably's Core SDKs. Understanding which core features are used to provide the abstractions in the Spaces SDK enables you to manage space state and build additional functionality into your application.
   *
   * A space is created as an Ably "channel":/channels. Members "attach":/channels#attach to the channel and join its "presence set":/presence-occupancy/presence when they "enter":#enter the space. Avatar stacks, member locations and component locking are all handled on this channel.
   *
   * To manage the state of the space, you can monitor the "state of the underlying channel":/channels#states. The channel object can be accessed through @space.channel@.
   *
   * The following is an example of registering a listener to wait for a channel to become attached:
   *
   * ```[javascript]
   * space.channel.on('attached', (stateChange) => {
   *   console.log(stateChange)
   * });
   * ```
   *
   * <aside data-type='note'>
   * <p>Due to the high frequency at which updates are streamed for cursor movements, live cursors utilizes its own "channel":/channels.</p>
   * </aside>
   * <!-- END WEBSITE DOCUMENTATION -->
   *
   * <!-- BEGIN WEBSITE DOCUMENTATION (https://github.com/ably/docs/blob/cb5de6a6a40abdcb0d9d5af825928dd62dc1ca64/content/spaces/cursors.textile?plain=1#L108-L122) -->
   * h2(#options). Cursor options
   *
   * Cursor options are set when creating or retrieving a @Space@ instance. They are used to control the behavior of live cursors.
   *
   * The following cursor options can be set:
   *
   * h3(#batch). outboundBatchInterval
   *
   * The @outboundBatchInterval@ is the interval at which a batch of cursor positions are published, in milliseconds, for each client. This is multiplied by the number of members in a space.
   *
   * The default value is 25ms which is optimal for the majority of use cases. If you wish to optimize the interval further, then decreasing the value will improve performance by further 'smoothing' the movement of cursors at the cost of increasing the number of events sent. Be aware that at a certain point the rate at which a browser is able to render the changes will impact optimizations.
   *
   * h3(#pagination). paginationLimit
   *
   * The volume of messages sent can be high when using live cursors. Because of this, the last known position of every members' cursor is obtained from "history":/storage-history/history. The @paginationLimit@ is the number of pages that should be searched to find the last position of each cursor. The default is 5.
   * <!-- END WEBSITE DOCUMENTATION -->
   */
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

export default Spaces;
