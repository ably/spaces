# Usage Instructions

This page contains detailed documentation to help you use the Spaces SDK.

## Prerequisites

### Ably API key

To start using this SDK, you will need the following:

* An Ably account
  * You can [sign up](https://ably.com/signup) to the generous free tier.
* An Ably API key
  * Use the default or create a new API key in an app within your [Ably account dashboard](https://ably.com/dashboard).
  * Make sure your API key has the following [capabilities](https://ably.com/docs/auth/capabilities): `publish`, `subscribe`, `presence` and `history`.

### Environment

Spaces is built on top of the [Ably JavaScript SDK](https://github.com/ably/ably-js). Although the SDK supports Node.js and other JavaScript environments, at the time of writing our main target is an ES6 compatible browser environment.

## Installation

### NPM

You'll need to install both the ably client and the spaces client:

```sh
npm install ably @ably/spaces
```

### CDN

You can also use Spaces with a CDN like [unpkg](https://www.unpkg.com/):

```html
<script src="https://cdn.ably.com/lib/ably.min-1.js"></script>
<script src="https://unpkg.com/@ably/spaces@0.1.2/dist/iife/index.bundle.js"></script>
```

> **Note**
>
> If you do this, then replace the call to `new Realtime.Promise` in the next section with `new Ably.Realtime.Promise`.

## Authentication and instantiation

Spaces use an [Ably promise-based realtime client](https://github.com/ably/ably-js#using-the-async-api-style). You can pass an Ably client directly to the spaces constructor.

The Ably client instantiation accepts client options. You will need at minimum an [Ably API key](#ably-api-key) and a [clientId](https://ably.com/docs/auth/identified-clients?lang=javascripts). A clientId represents an identity of an connection. In most cases this will something like the id of a user:

```ts
import { Realtime } from 'ably/promise';
import Spaces from '@ably/spaces';

const client = new Realtime.Promise({ key: "<API-key>", clientId: "<client-ID>" });
const spaces = new Spaces(client);
```

You can access the Ably client via `spaces.ably`.

To learn more about authenticating with ably, see our [authentication documentation](https://ably.com/docs/auth).

## Create a space

A space is the virtual area of an application you want users to collaborate in, such as a web page, or slideshow. A `space` is uniquely identified by its name. A space is created, or an existing space retrieved from the `spaces` collection by calling the `get()` method. You can only connect to one space in a single operation. The following is an example of creating a space called "demonSlideshow":

```ts
const space = await spaces.get('demoSlideshow');
```

### Options

A set of `spaceOptions` can be passed to space when creating or retrieving it. See the [class definitions](https://sdk.ably.com/builds/ably/spaces/main/typedoc/interfaces/SpaceOptions.html) for details on what options are available.

The following is an example of setting `offlineTimeout` to 3 minutes and a `paginationLimit` of 10:

```ts
const space = await spaces.get('demoSlideshow', { offlineTimeout: 180_000, cursors: { paginationLimit: 10 } });
```

### Subscribe to a space

You can subscribe to events in a space:

```ts
space.subscribe('update', (spaceState) => {
  console.log(spaceState);
});
```

This gets triggered on [member](#members) and [location](#location) events.

Similarly you can unsubscribe:

```ts
space.unsubscribe();
```

### Enter a space

To become a member of a space (and use the other APIs, like location or cursors) a client needs to enter a space.

```ts
await space.enter();
```

This method can take an optional object called `profileData` so that users can include convenient metadata to update an avatar stack, such as a username and profile picture.

```ts
await space.enter({
  username: 'Claire Lemons',
  avatar: 'https://slides-internal.com/users/clemons.png',
});
```

### Leave a space

A leave event is sent when a user leaves a space. This can occur for one of the following reasons:

- `space.leave()` is called explicitly
- The user closes the tab
- The user is abruptly disconnected from the internet for longer than 2 minutes

A leave event does not remove the member immediately from `space.members`. Instead, they are removed after a timeout which is configurable by the [`offlineTimeout` option](#options). This allows the UI to display an intermediate state before disconnection/reconnection.

As with `enter`, you can update the `profileData` on leave:

```ts
await space.leave({
  username: 'Claire Lemons',
  avatar: 'https://slides-internal.com/users/inactive.png',
});
```

### Update profileData

To update `profileData` after entering the space, use the `updateProfileData()` method. Pass new `profileData` or a function to base the new `profileData` of the existing value:

```ts
await space.updateProfileData((oldProfileData) => {
  return {
    ...oldProfileData,
    username: 'Clara Lemons'
  }
});
```

## Members

When you enter a space, you become a `member`. On the client, your own membership is to referred to as `self`. You can get your `self` by calling `space.members.getSelf()`. To get all the members (including self), call `space.members.getAll()`. These methods will return (respectively an object and array of):

```json
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

See [SpaceMember](https://sdk.ably.com/builds/ably/spaces/main/typedoc/interfaces/SpaceMember.html) for details on properties.

### Member events

Subscribe to either all the member events or specifically to `enter`, `leave`, `remove` or `updateProfile` events related to members in a space.

To listen to all events pass either no event name or `update`:

```ts
space.members.subscribe((memberUpdate) => {
  console.log(memberUpdate);
});
```

```ts
space.members.subscribe('update', (memberUpdate) => {
  console.log(memberUpdate);
});
```

#### enter

Emitted when a member enters a space. Called with the member entering the space.

```ts
space.members.subscribe('enter', (memberJoined) => {
  console.log(memberJoined);
});
```

#### leave

Emitted when a member leaves a space. Called with the member leaving the space.

```ts
space.members.subscribe('leave', (memberLeft) => {
  console.log(memberLeft);
});
```

#### remove

Emitted when a member is removed from a space. Called with the member removed from the space.

```ts
space.members.subscribe('remove', (memberRemoved) => {
  console.log(memberRemoved);
});
```

#### updateProfile

Emitted when a member updates their `profileData` via `space.updateProfileData()`:

```ts
space.members.subscribe('updateProfile', (memberProfileUpdated) => {
  console.log(memberProfileUpdated);
});
```



To stop listening to member events, users can call the `space.members.unsubscribe()` method. See [Event emitters](#event-emitters) for options and usage.


## Location

Each member can set a location for themselves:

```ts
space.locations.set({ slide: '3', component: 'slide-title' });
```

A location does not have a prescribed shape. In your UI it can represent a single location (an id of a field in form), multiple locations (id's of multiple cells in a spreadsheet) or a hierarchy (a field in one of the multiple forms visible on screen).

The location property will be set on the [member](#members).

A location event will be emitted when a member updates their location:

```ts
space.locations.subscribe('update', (locationUpdate) => {
  console.log(locationUpdate);
});
```

When a member leaves, their location is set to `null`.

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

## Live Cursors

A common feature of collaborative apps is to show where a users cursors is positioned in realtime. It's easy to accomplish this with the `cursors` API.

The most common use case is to show the current mouse pointer position.

To start listening to cursor events, use the `subscribe()` method:

```ts
space.cursors.subscribe('update', (cursorUpdate) => {
  console.log(cursorUpdate);
});
```

The listener will be called with a `CursorUpdate`:

```json
{
  "connectionId": "hd9743gjDc",
  "clientId": "clemons#142",
  "position": { "x": 864, "y": 32 },
  "data": { "color": "red" }
}
```

To set the position of a cursor and emit a `CursorUpdate`, first enter the space if you haven't already:

```ts
space.enter();
```

Then call `set`:

```ts
window.addEventListener('mousemove', ({ clientX, clientY }) => {
  space.cursors.set({ position: { x: clientX, y: clientY } });
});
```

A `CursorUpdate` is an object with 2 properties. `position` is an object with 2 required properties, `x` and `y`. These represent the position of the cursor on a 2D plane. A second optional property, `data` can also be passed. This is an object of any shape and is meant for data associated with the cursor movement (like drag or hover calculation results):

```ts
window.addEventListener('mousemove', ({ clientX, clientY }) => {
  space.cursors.set({ position: { x: clientX, y: clientY }, data: { color: 'red' } });
});
```

### Initial cursor position and data

To retrieve the initial position and data of all cursors within a space, you can use the `space.cursors.getAll()` method. This returns an object keyed by `connectionId`. The value is the last `cursorUpdate` set by the given `connectionId`.

Example of calling `getAll()` to return all cursor positions:

```ts
const lastPositions = await space.cursors.getAll();
```

```ts
{
  "hd9743gjDc": {
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

## Event Emitters

`space`, `members`, `cursors` and `locations` are event emitters. Event emitters provide `subscribe()` and `unsubscribe()` methods to attach/detach event listeners. Both methods support overloaded versions, described below.


Calling `subscribe()` with a single function argument will subscribe to all events on that emitter.

```ts
space.members.subscribe();
```

Calling `subscribe()` with a named event and a function argument will subscribe to that event only.

```ts
space.members.subscribe('enter', () => {});
```

Calling `subscribe()` with an array of named events and a function argument will subscribe to those events.

```ts
space.members.subscribe(['enter', 'leave'], () => {});
```

Calling `unsubscribe()` with no arguments will remove all registered listeners.

```ts
space.members.unsubscribe();
```

Calling `unsubscribe()` with a single named event will remove all listeners registered for that event.

```ts
space.members.unsubscribe('enter');
```

Calling `unsubscribe()` with an array of named events will remove all listeners registered for those events.

```ts
space.members.unsubscribe(['enter', 'leave']);
```

Calling `unsubscribe()` and adding a listener function as the second argument to both of the above will remove only that listener.

```ts
const listener = () => {};
space.members.unsubscribe('update', listener);
space.members.unsubscribe(['update'], listener);
```

As with the native DOM API, this only works if the listener is the same reference as the one passed to `subscribe()`.
