# In-depth usage

## Authenticate and instantiate

Import the Ably JavaScript SDK and the Collaborative Spaces SDK. Create an instance of the Ably JavaScript SDK using your Ably API key and then pass that value to the Collaborative Spaces SDK constructor:

```ts
import { Realtime } from 'ably/promise';
import Spaces from '@ably-labs/spaces';

const client = new Realtime(ABLY_API_KEY);
const spaces = new Spaces(client);
```

## Create a space

A space is the virtual area of an application you want to monitor, such as a web page, or slideshow. A `space` is uniquely identified by its name. A space is created, or an existing space retrieved from the `spaces` collection by calling the `get()` method. You can only connect to one space in a single operation. The following is an example of creating a space called "demonSlideshow":

```ts
const space = spaces.get('demoSlideshow');
```

A set of `spaceOptions` can be passed to space when creating or retrieving it. `spaceOptions` enable additional properties to be set for the space. The following properties can be set:

| Property | Description | Type |
| -------- | ----------- | ---- |
| offlineTimeout | The time in milliseconds before a member is removed from a space after they have disconnected. The default is 120,000 (2 minutes). | number |

The following is an example of setting `offlineTimeout` to 3 minutes when creating a space:

```ts
const space = spaces.get('demoSlideshow', { offlineTimeout: 180_000 });
```

## Subscribe to member updates

Subscribe to `membersUpdate` events in order to display which users are present in a space, such as in an avatar stack. The `membersUpdate` events for a space notify subscribers when clients join and leave it. Use the `space.on()` method to register a listener for `membersUpdate` events.

The following is an example of subscribing to updates for a space:

```ts
space.on('membersUpdate', (members) => {
  console.log(members);
});
```

The following is an example `membersUpdate` event received by subscribers when a user enters a space:

```json
[
  {
    "clientId": "clemons@slides.com",
    "isConnected": true,
    "lastEvent": {
      "name": "enter",
      "timestamp": 1677595689759
    },
    "location": null,
    "profileData": {
      "username": "Claire Lemons",
      "avatar": "https://slides-internal.com/users/clemons.png"
    }
  }
]
```

The following are the properties of a `spaceMember` event:

| Property | Description | Type |
| -------- | ----------- | ---- |
| clientId | The client identifier for the user. | string |
| isConnected | Whether the user is connected to Ably or not. | boolean |
| lastEvent | The most recent event emitted by the user and its timestamp. Events will be either `enter` or `leave`. | {name: string, timestamp: number} |
| location | The current location of the user within the space. | any |
| profileData | Optional user data that can be attached to a user, such as a username or image to display in an avatar stack. | object |

To stop subscribing to member events, users can call the `space.off()` method.

### Request member updates

In addition to subscribing to events to see who joins and leaves a space, it is also possible to query the membership of a space in a one-off request using `getMembers()`. This returns an array of `spaceMember` objects. 

The `getSelf()` method can be used to return the `spaceMember` object for the local client.

## Enter a space

When a user enters a space they should call `enter()`. This publishes an event to all subscribers of that space.

`space.enter()` can take an optional object called `profileData` so that users can include convenient metadata to update an avatar stack, such as a username and profile picture.

The following is an example of entering a space with `profileData`:

```ts
space.enter({
  username: "Claire Lemons",
  avatar: "https://slides-internal.com/users/clemons.png",
});
```

### Leave a space

A leave event is sent when a user leaves a space. This can occur for one of the following reasons:

* `space.leave()` is called explicitly.
* The user closes the tab.
* The user is abruptly disconnected from the internet for longer than 2 minutes.
  * Note that the time before they are seen has having left the space is configurable using `offlineTimeout`.

## Subscribe to location updates

Subscribe to `locationUpdate` events in order to display where users are within a space, such as which slide number they are currently viewing, or which cell or component they have selected. `locationUpdate` events for a space are sent when a user calls `locations.set()`, which can be configured to fire for whichever UI interactions you'd like. Use the `locations.on()` method to register a listener for `locationUpdates` events.

The following is an example of subscribing to location updates for a space:

```ts
space.locations.on('locationUpdate', (update) => {
  console.log(update);
});
```

The following is an example `locationUpdate` event received by subscribers when a user changes location:

```json
{
    "member": {
    "clientId": "clemons@slides.com",
    "isConnected": true,
    "profileData": {
      "username": "Claire Lemons",
      "avatar": "https://slides-internal.com/users/clemons.png"
    },
    "location": {"slide": "3", "component": "slide-title"},
    "lastEvent": { "name": "update", "timestamp": 1 },
    "connections": ["2"],
  },
  "previousLocation": {"slide": "2", "component": null },
  "currentLocation": {"slide": "3", "component": "slide-title"}
}
```

The following are the properties of a `locationUpdate` event:

| Property | Description | Type |
| -------- | ----------- | ---- |
| member | The details of the user that has changed location. | [`spaceMember`](#subscribe-to-member-updates) |
| previousLocation | The previous location of the user within the space. | any |
| currentLocation | The current location of the user within the space. | any |

To stop subscribing to location updates, users can call the `locations.off()` method.

### Track an individual location or user

It is also possible to track a specific location or user, rather than subscribing to all events using `createTracker()`.

The following is an example of creating a tracker for a specific user based on their `clientId`, and then subscribing to updates for only that user:

```ts
const memberTracker = space.locations.createTracker(
  (change) => change.member.clientId === 'clemons@slides.com'
);

memberTracker.on((change) => {
  console.log(change);
});
```

The following is an example of creating a tracker for a specific location, such as a single UI element, and then subscribing to updates for only that location:

```ts
const locationTracker = space.locations.createTracker(
  (change) => change.previousLocation === 'slide-title'
);

locationTracker.on((change) => {
  console.log(change);
});
```

## Set a location

Use `locations.set()` to publish a `locationUpdate` that will be received by all users subscribed to location updates.

The following is an example of setting a location update: 

```ts
space.locations.set({slide: '3', component: 'slide-title'});
```
