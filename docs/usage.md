# Usage

## Prerequisites

### Ably API key

To use Spaces, you will need the following:

- An Ably account. You can [sign up](https://ably.com/signup) for free.
- An Ably API key. You can create API keys in an app within your [Ably account](https://ably.com/dashboard).
  - The API key needs the following [capabilities](https://ably.com/docs/realtime/authentication#capabilities-explained): `publish`, `subscribe`, `presence` and `history`.

### Environment

Spaces is built on top of the [Ably JavaScript SDK](https://github.com/ably/ably-js). Although the SDK supports Node.js and other JavaScript environments, at the time of writing our main target is an ES6 compatible browser environment.

## Installation

### NPM

```sh
npm install @ably-labs/spaces
```

If you need the Ably client (see [Authentication & instantiation](#authentication-and-instantiation))

```sh
npm install ably
```

### CDN

You can also use Spaces with a CDN like [unpkg](https://www.unpkg.com/):

```html
<script src="https://cdn.ably.com/lib/ably.min-1.js"></script>
<script src="https://unpkg.com/@ably-labs/spaces@0.0.10/dist/iife/index.bundle.js"></script>
```

Note that when you use a CDN, you need to include Ably Client as well, the Spaces bundle does not include it.

## Authentication and instantiation

Spaces use an [Ably promise-based realtime client](https://github.com/ably/ably-js#using-the-async-api-style). You can either pass an existing client to Spaces or pass the [client options](https://ably.com/docs/api/realtime-sdk?lang=javascript#client-options) directly to the spaces constructor.

To instantiate with options, you will need at minimum an [Ably API key](#ably-api-key) and a [clientId](https://ably.com/docs/auth/identified-clients?lang=javascripts). A clientId represents an identity of an connection. In most cases this will something like the id of a user:

```ts
import Spaces from '@ably-labs/spaces';

const spaces = new Spaces({ key: ABLY_API_KEY, clientId: 'someClientId' });
```

If you already have an ably client in your application, you can just pass it directly to Spaces (the client will still need to instatiated with a clientId):

```ts
import { Realtime } from 'ably/promise';
import Spaces from '@ably-labs/spaces';

const client = new Realtime.Promise(options);
const spaces = new Spaces(client);
```

In both scenarios, you can access the client via `spaces.ably`.

To learn more about authenticating with ably, see our [authentication documentation](https://ably.com/docs/auth).

## Create a space

A space is the virtual area of an application you want to collaborate in, such as a web page, or slideshow. A `space` is uniquely identified by its name. A space is created, or an existing space retrieved from the `spaces` collection by calling the `get()` method. You can only connect to one space in a single operation. The following is an example of creating a space called "demonSlideshow":

```ts
const space = await spaces.get('demoSlideshow');
```

### Options

A set of `spaceOptions` can be passed to space when creating or retrieving it. The following properties can be set:

| Property       | Description                                                                                                                         | Type   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------ |
| offlineTimeout | The time in milliseconds before a member is removed from a space after they have disconnected. The default is 120000ms (2 minutes). | number |
| cursors        | Options relating to configuring the cursors API (see below)                                                                         | object |

| Property              | Description                                                                                                                                                                    | Type   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| outboundBatchInterval | The interval in milliseconds at which a batch of cursor positions are published. This is multiplied by the number of members in the space minus 1. The default value is 100ms. | number |
| paginationLimit       | The number of pages searched from [history](https://ably.com/docs/realtime/history) for the last published cursor position. The default is 5.                                  | number |

The following is an example of setting `offlineTimeout` to 3 minutes and a `paginationLimit` of 10:

```ts
const space = await spaces.get('demoSlideshow', { offlineTimeout: 180_000, cursors: { paginationLimit: 10 } });
```

## Members

Members is a core concept of the library. When you enter a space, you become a `member`. On the client, your own membership is to referred to as `self`. You can get your `self` by calling `space.getSelf`. To get all the members (including self), call `space.getMembers`. These method will return (respectively an object and array of):

```js
{
  "clientId": "clemons#142",
  "connectionId": "hd9743gjDc",
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
```

#### clientId

The client identifier for the user, provided to the ably client instance.

_Type: string_

#### connectionId

Identifier for the connection used by the user. This is a unique identifier.

_Type: string_

#### isConnected

Whether the user is connected to Ably or not.

_Type: boolean_

#### lastEvent

The most recent event emitted by [presence](https://ably.com/docs/presence-occupancy/presence?lang=javascript) and its timestamp. Events will be either `enter`, `leave`, `update` or `present`.

_Type: { name: string; timestamp: number }_

#### location

The current location of the user within the space.

_Type: string | object | null_

#### profileData

Optional user data that can be attached to a user, such as a username or image to display in an avatar stack.

_Type: object | null_

### Listen to members updates

The `space` instance is an `EventEmitter`. Events will be emitted for updates to members (includeing self). You can listen to the following events:

#### enter

Emitted when a member enters a space. Called with the member entering the space.

#### leave

Emitted when a member leaves a space. Called with the member leaving the space.

#### membersUpdate

Emitted when members enter, leave and their location is updated. Called with an array of all the members in the space.

```ts
space.on('membersUpdate', (members) => {
  console.log(members);
});
```

To stop listening to member events, users can call the `space.off()` method. See [Event emitters](#event-emitters) for options and usage.

### Enter a space

To become a member of space (and use the other APIs, like location or cursors) a client needs to enter a space.

```ts
space.enter();
```

This method can take an optional object called `profileData` so that users can include convenient metadata to update an avatar stack, such as a username and profile picture.

```ts
space.enter({
  username: 'Claire Lemons',
  avatar: 'https://slides-internal.com/users/clemons.png',
});
```

### Leave a space

A leave event is sent when a user leaves a space. This can occur for one of the following reasons:

- `space.leave()` is called explicitly.
- The user closes the tab.
- The user is abruptly disconnected from the internet for longer than 2 minutes

A leave event does not remove the member immediately from members. Instead, they are removed after a timeout which is configurable by the [`offlineTimeout` option](#options). This allows the UI to display an intermediate state before disconnection/reconnection.

As with `enter`, you can update the `profileData` on leave:

```ts
space.leave({
  username: 'Claire Lemons',
  avatar: 'https://slides-internal.com/users/inactive.png',
});
```

## Location

Each member can set a location for themselves:

```ts
space.locations.set({ slide: '3', component: 'slide-title' });
```

A location does not have a prescribed shape. In your UI it can represent a single location (an id of a field in form), multiple locations (id's of multiple cells in a spredsheet) or a hierarchy (a field in one of the multiple forms visible on screen).

The location property will be set on the [member](#members).

Because locations are part of members, a `memberUpdate` event will be emitted when a member updates their location. When a member leaves, their location is set to `null`.

```ts
space.on('membersUpdate', (members) => {
  console.log(members);
});
```

However, it's possible to listen just location updates. `locations` is an [event emitter](#event-emitters) and will emith the `locationUpdate` event:

```ts
space.locations.on('locationUpdate', (locationUpdate) => {
  console.log(locationUpdate);
});
```

This event will include the member affected by the change, as well as their previous and current locations:

```json
{
  "member": {
    "clientId": "clemons#142",
    "connectionId": "hd9743gjDc",
    "isConnected": true,
    "profileData": {
      "username": "Claire Lemons",
      "avatar": "https://slides-internal.com/users/clemons.png"
    },
    "location": {
      "slide": "3",
      "component": "slide-title"
    },
    "lastEvent": {
      "name": "update",
      "timestamp": 1
    }
  },
  "previousLocation": {
    "slide": "2",
    "component": null
  },
  "currentLocation": {
    "slide": "3",
    "component": "slide-title"
  }
}
```

### Track an individual location or member

To listen only to events for a specific member or location, we can use `createTracker`. This method filters messages based on a user provided predicate.

_Note that this is client-side filtering only, messages are still sent/received for updates._

Create a tracker for a specific member based on their `clientId`, and then listen to updates for only that user:

```ts
const memberTracker = space.locations.createTracker(
  (locationUpdate) => locationUpdate.member.clientId === 'clemons#142',
);

memberTracker.on((locationUpdate) => {
  console.log(locationUpdate);
});
```

Create a tracker for a specific location, such as a single UI element, and listen to updates:

```ts
const locationTracker = space.locations.createTracker(
  (locationUpdate) =>
    locationUpdate.previousLocation === 'slide-title' || locationUpdate.currentLocation === 'slide-title',
);

locationTracker.on((locationUpdate) => {
  console.log(locationUpdate);
});
```

## Live Cursors

A common feature of collaborative apps is to show where a users cursors is positioned in realtime. It's easy to accomplish this with `cursors` API.

Unlike a location, you can have multiple cursors. This can be used to represent multiple devices interacting with the UI or different ways of interacting with the browser (like scrolling).

The most common use case is however to show the current mouse/touchpad position.

To get started, you'll need to get a named cursor instance:

```ts
const mouseMove = space.cursors.get('mouseMove');
```

This instance can emit events for [`self`](#members) and listen to all positions emitted for the given named cursor (`mouse`), for all members (including self).

```ts
window.addEventListner('mousemove', ({ clientX, clientY }) => {
  mouseMove.set({ position: { x: clientX, y: clientY } });
});
```

`set` takes an object with 2 properties. `position` is an object with 2 required properties, `x` and `y`. These represent the position of the cursor on a 2D plane. A second property, `data` can passed. This is an object of any shape and is meant for data associated with the cursor movement (like drag or hover calculation results):

```ts
window.addEventListner('mousemove', ({ clientX, clientY }) => {
  mouseMove.set({ position: { x: clientX, y: clientY }, data: '' });
});
```

The cursor instance is an [event emitter](#event-emitters):

```ts
mouseMove.on('cursorUpdate', (cursorUpdate) => {
  console.log(cursorUpdate);
});
```

As is the `cursors` namespace itself, emitting events for all named cursors:

```ts
space.cursors.on('cursorsUpdate', (cursorUpdate) => {
  console.log(cursorUpdate);
});
```

The following is an `cursorUpdate` event received by listeners when a cursor sets their position or data:

```json
{
  "name": "mousemove",
  "connectionId": "hd9743gjDc",
  "clientId": "clemons#142",
  "position": { "x": 864, "y": 32 },
  "data": { "color": "red" }
}
```

The following are the properties of a `cursorUpdate` event:

| Property     | Description                                                        | Type           |
| ------------ | ------------------------------------------------------------------ | -------------- |
| name         | The name of the cursor.                                            | string         |
| connectionId | The unique connection identifier for the user.                     | string         |
| clientId     | The client identifier for the user.                                | string         |
| position     | The x and y coordinates of the cursor.                             | cursorPosition |
| data         | Optional additional information about a cursor, such as its color. | cursorData     |

`cursorPosition`

| Property | Description  | Type   |
| -------- | ------------ | ------ |
| x        | x coordinate | number |
| y        | y coordinate | number |

### Inital cursor position and data

To retrieve the initial position & data of all cursors within a space, you can use the `cursors.getAll()` method. This returns an object keyed by `connectionId` and cursor name. The value is the last `cursorUpdate` set by the given `connectionId`.

Example of calling `getAll` to return all cursor positions:

```ts
const allCursors = await space.cursors.getAll();
```

```ts
{
  "hd9743gjDc": {
    "mousemove": {
      "name": "mousemove",
      "connectionId": "hd9743gjDc",
      "clientId": "clemons#142",
      "position": {
        "x": 864,
        "y": 32
      },
      "data": {
        "color": "red"
      }
    }
  }
}
```

Example of calling `getAll` to get the last positions for the named cursor `mousemove`:

```ts
const allCursors = await space.cursors.getAll('mousemove');
```

```ts
{
  "hd9743gjDc": {
    "name": "mousemove",
    "connectionId": "hd9743gjDc",
    "clientId": "clemons#142",
    "position": {
      "x": 864,
      "y": 32
    },
    "data": {
      "color": "red"
    }
  }
}
```

| Property | Description                                                                                                                                 | Type   |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| name     | The name of a cursor to retrieve the position for. This name is set by a user when they [create a cursor instance](#set-a-cursor-position). | string |

## Event Emitters

All Spaces APIs inherit from an [EventEmitter class](/src/utilities/EventEmitter.ts) and support the same event API.

Calling `on` with a single function argument will subscribe to all events on that emitter.

```ts
space.on(() => {});
```

Calling `on` with a named event & a function argument will subscribe to that event only.

```ts
space.on(`membersUpdate`, () => {});
```

Calling `on` with an array of named events & a function argument will subscribe to those events.

```ts
space.on([`membersUpdate`], () => {});
```

Calling `off` with no argumnets will remove all registered listeners.

```ts
space.off();
```

Calling `off` with a single named event will remove all listeners registered for that event.

```ts
space.off(`membersUpdate`);
```

Calling `off` with an array of named events will remove all listeners registered for those events.

```ts
space.off([`membersUpdate`]);
```

Calling `off` and adding a listener function as the second argument to both of the above will remove only that listener.

```ts
const listener = () => {};
space.off(`membersUpdate`, listener);
space.off([`membersUpdate`], listener);
```

As with the native DOM api, this only works if the listener is the same reference as the one passed to `on`.
