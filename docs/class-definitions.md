# Spaces

## Constructor

Create a new instance of the Space SDK by passing an instance of the realtime, promise-based [Ably client](https://github.com/ably/ably-js):

```ts
import { Realtime } from 'ably/promise';
import Spaces from '@ably-labs/spaces';

const client = new Realtime.Promise({ key: "<API-key>", clientId: "<client-ID>" });
const spaces = new Spaces(client);
```

Please note that a [clientId](https://ably.com/docs/auth/identified-clients?lang=javascript) is required.

An API key will required for [basic authentication](https://ably.com/docs/auth/basic?lang=javascript). We strongly recommended that you use [token authentication](https://ably.com/docs/realtime/authentication#token-authentication) in any production environments.

Refer to the [Ably docs for the JS SDK](https://ably.com/docs/getting-started/setup?lang=javascript) for information on setting up a realtime promise client.

### Properties

#### ably

Instance of the [Ably-JS](https://github.com/ably/ably-js#introduction) client that was passed to the [constructor](#constructor).

```ts
type ably = Ably.RealtimePromise;
```

#### version

Version of the Spaces library.

```ts
type version = string;
```

### Methods

#### get()

Get or create a Space instance. Returns a [Space](#space) instance. Configure the space by passing [SpaceOptions](#spaceoptions) as the second argument.

```ts
type get = (name: string, options?: SpaceOptions) => Promise<Space>;
```

### Related Types

#### SpaceOptions

Used to configure a Space instance on creation.

```ts
type SpaceOptions = {
  offlineTimeout?: number;
  cursors?: CursorsOptions;
};
```

#### offlineTimeout

Number of milliseconds after a user loses connection or closes their browser window to wait before their [SpaceMember](#spacemember) object is removed from the members list. The default is 120000ms (2 minutes).

#### cursors

Options relating to configuring the cursors API (see below).

#### CursorsOptions

```ts
type CursorsOptions = {
  outboundBatchInterval?: number;
  paginationLimit?: number;
};
```

#### outboundBatchInterval

The interval in milliseconds at which a batch of cursor positions are published. This is multiplied by the number of members in the space minus 1. The default value is 100ms.

#### paginationLimit

The number of pages searched from [history](https://ably.com/docs/storage-history/history) for the last published cursor position. The default is 5.

## Space

An instance of a Space created using [spaces.get](#get). Inherits from [EventEmitter](/docs/usage.md#event-emitters).

### Properties

#### members

An instance of [Members](#members).

```ts
type members = instanceof Members;
```

#### cursors

An instance of [Cursors](#cursors).

```ts
type cursors = instanceof Cursors;
```

#### locations

An instance of [Locations](#locations).

```ts
type locations = instanceof Locations;
```

### Methods

#### enter()

Enter the space. Can optionally take `profileData`. This data can be an arbitrary JSON-serializable object which will be attached to the [member object](#spacemember). Returns all current space members.

```ts
type enter = (profileData?: Record<string, unknown>) => Promise<SpaceMember[]>;
```

#### leave()

Leave the space. Can optionally take `profileData`. This triggers the `leave` event, but does not immediately remove the member from the space. See [offlineTimeout](#spaceoptions).

```ts
type leave = (profileData?: Record<string, unknown>) => Promise<void>;
```

#### updateProfileData()

Update `profileData`. This data can be an arbitrary JSON-serializable object which is attached to the [member object](#spacemember). If the connection
has not entered the space, calling `updateProfileData` will call `enter` instead.

```ts
type updateProfileData = (profileDataOrUpdateFn?: unknown| (unknown) => unknown) => Promise<void>;
```

A function can also be passed in. This function will receive the existing `profileData` and lets you update based on the existing value of `profileData`:

```ts
await space.updateProfileData((oldProfileData) => {
  const newProfileData = getNewProfileData();
  return { ...oldProfileData, ...newProfileData };
})
```

## Space Members

Handles members within a space.

### Methods

#### subscribe()

Listen to member events for the space. See [EventEmitter](/docs/usage.md#event-emitters) for overloading usage.

  ```ts
  space.members.subscribe((member: SpaceMember) => {});
  ```

  The argument supplied to the callback is the [SpaceMember](#spacemember) object representing the member that triggered the event.

  Available events:

- ##### **enter**

  Listen to enter events of members.

  ```ts
  space.members.subscribe('enter', (member: SpaceMember) => {})
  ```
  The argument supplied to the callback is a [SpaceMember](#spacemember) object representing the member entering the space.

- ##### **leave**

  Listen to leave events of members. The leave event will be issued when a member calls `space.leave()` or is disconnected.

  ```ts
  space.members.subscribe('leave', (member: SpaceMember) => {})
  ```

  The argument supplied to the callback is a [SpaceMember](#spacemember) object representing the member leaving the space.

- ##### **remove**

  Listen to remove events of members. The remove event will be triggered when the [offlineTimeout](#spaceoptions) has passed.

  ```ts
  space.members.subscribe('remove', (member: SpaceMember) => {})
  ```

  The argument supplied to the callback is a [SpaceMember](#spacemember) object representing the member removed from the space.

- ##### **update**

  Listen to profile update events of members.

  ```ts
  space.members.subscribe('update', (member: SpaceMember) => {})
  ```
  The argument supplied to the callback is a [SpaceMember](#spacemember) object representing the member entering the space.


#### unsubscribe()

Remove all the event listeners or specific listeners. See [EventEmitter](/docs/usage.md#event-emitters) for detailed usage.

```ts
// Unsubscribe from all events
space.members.unsubscribe();

// Unsubscribe from enter events
space.members.unsubscribe('enter');

// Unsubscribe from leave events
space.members.unsubscribe('leave');
```

#### getSelf()

Returns a Promise which resolves to the [SpaceMember](#spacemember) object relating to the local connection. Will resolve to `undefined` if the client hasn't entered the space yet.

```ts
type getSelf = () => Promise<SpaceMember | undefined>;
```

Example:

```ts
const myMember = await space.members.getSelf();
```

#### getAll()

Returns a Promise which resolves to an array of all [SpaceMember](#spacemember) objects (members) currently in the space, including any who have left and not yet timed out. (_see: [offlineTimeout](#spaceoptions)_)

```ts
type getAll = () => Promise<SpaceMember[]>;
```

Example:

```ts
const allMembers = await space.members.getAll();
```

#### getOthers()

Returns a Promise which resolves to an array of all [SpaceMember](#spacemember) objects (members) currently in the space, excluding your own member object.

```ts
type getSelf = () => Promise<SpaceMember[]>;
```

Example:

```ts
const otherMembers = await space.members.getOthers();
```

### Related Types

#### SpaceMember

A SpaceMember represents a member within a Space instance. Each new connection that enters will create a new member, even if they have the same [`clientId`](https://ably.com/docs/auth/identified-clients?lang=javascript).

```ts
type SpaceMember = {
  clientId: string;
  connectionId: string;
  isConnected: boolean;
  profileData: Record<string, unknown>;
  location: Location;
  lastEvent: PresenceEvent;
};
```

##### clientId

The client identifier for the user, provided to the ably client instance.

##### connectionId

Identifier for the connection used by the user. This is a unique identifier.

##### isConnected

Whether the user is connected to Ably.

##### profileData

Optional user data that can be attached to a user, such as a username or image to display in an avatar stack.

##### location

The current location of the user within the space.

##### lastEvent

The most recent event emitted by [presence](https://ably.com/docs/presence-occupancy/presence?lang=javascript) and its timestamp. Events will be either `enter`, `leave`, `update` or `present`.

#### PresenceEvent

```ts
type PresenceEvent = {
  name: 'enter' | 'leave' | 'update' | 'present';
  timestamp: number;
};
```

## Member Locations

Handles the tracking of member locations within a space. Inherits from [EventEmitter](/docs/usage.md#event-emitters).

### Methods

#### subscribe()

Listen to events for locations. See [EventEmitter](/docs/usage.md#event-emitters) for overloading usage.

Available events:

- ##### **update**

  Fires when a member updates their location. The argument supplied to the event listener is a [LocationUpdate](#locationupdate-1).

  ```ts
  space.locations.subscribe('update', (locationUpdate: LocationUpdate) => {});
  ```

#### set()

Set your current location. [Location](#location-1) can be any JSON-serializable object. Emits a [locationUpdate](#locationupdate) event to all connected clients in this space.

```ts
type set = (update: Location) => Promise<void>;
```

#### unsubscribe()

Remove all event listeners, all event listeners for an event, or specific listeners. See [EventEmitter](/docs/usage.md#event-emitters) for detailed usage.

```ts
space.locations.unsubscribe('update');
```

#### getSelf()

Get location for self.

```ts
type getSelf = () => Promise<Location | undefined>;
```

Example:

```ts
const myLocation = await space.locations.getSelf();
```

#### getAll()

Get location for all members.

```ts
type getAll = () => Promise<Record<ConnectionId, Location>>;
```

Example:

```ts
const allLocations = await space.locations.getAll();
```

#### getOthers()

Get location for other members

```ts
type getOthers = () => Promise<Record<ConnectionId, Location>>;
```

Example:

```ts
const otherLocations = await space.locations.getOthers()
```

### Related types

#### Location

Represents a location in an application.

```ts
type Location = string | Record<string, unknown> | null;
```

#### LocationUpdate

Represents a change between locations for a given [`SpaceMember`](#spacemember).

```ts
type LocationUpdate = {
  member: SpaceMember;
  currentLocation: Location;
  previousLocation: Location;
};
```

## Live Cursors

Handles tracking of member cursors within a space. Inherits from [EventEmitter](/docs/usage.md#event-emitters).

### Methods

#### subscribe()

Listen to `CursorUpdate` events. See [EventEmitter](/docs/usage.md#event-emitters) for overloaded usage.

Available events:

- ##### **update**

  Emits an event when a new cursor position is set. The argument supplied to the event listener is a [CursorUpdate](#cursorupdate).

  ```ts
  space.cursors.subscribe('update', (cursorUpdate: CursorUpdate) => {});
  ```

#### set()

Set the position of a cursor. This will emit a `CursorUpdate` event. If a member has not yet entered the space, this method will error.

A `CursorUpdate` is an object with 2 properties. `position` is an object with 2 required properties, `x` and `y`. These represent the position of the cursor on a 2D plane. A second optional property, `data` can also be passed. This is an object of any shape and is meant for data associated with the cursor movement (like drag or hover calculation results):

```ts
type set = (update: { position: CursorPosition, data?: CursorData })
```

Example usage:

```ts
window.addEventListener('mousemove', ({ clientX, clientY }) => {
  space.cursors.set({ position: { x: clientX, y: clientY }, data: { color: "red" } });
});
```

#### unsubscribe()

Remove all event listeners, all event listeners for an event, or specific listeners. See [EventEmitter](/docs/usage.md#event-emitters) for detailed usage.

```ts
space.cursors.unsubscribe('update');
```

#### getSelf()

Get the last CursorUpdate for self.

```ts
type getSelf = () => <CursorUpdate | undefined>;
```

Example:

```ts
const selfPosition = space.cursors.getSelf();
```

#### getAll()

Get the last CursorUpdate for each connection.

```ts
type getAll = () => Record<ConnectionId, CursorUpdate>;
```

Example:

```ts
const allLatestPositions = space.cursors.getAll();
```

#### getOthers()

Get the last CursorUpdate for each connection.

```ts
type getOthers = () => Record<ConnectionId, CursorUpdate>;
```

Example:

```ts
const otherPositions = space.cursors.getOthers();
```

### Related types

#### CursorUpdate

Represents an update to a cursor.

```ts
type CursorUpdate = {
  name: string;
  clientId: string;
  connectionId: string;
  position: CursorPosition;
  data?: CursorData;
};
```

#### CursorPosition

Represents a cursors position.

```ts
type CursorPosition = {
  x: number;
  y: number;
};
```

#### CursorData

Represent data that can be associated with a cursor update.

```ts
type CursorData = Record<string, unknown>;
```
