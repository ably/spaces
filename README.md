# Ably Spaces SDK

The **Spaces SDK** contains a purpose built set of APIs that help you build collaborative environments for your apps to quickly enable remote team collaboration. Try out a [live demo](https://space.ably.dev) of a slideshow application for an example of realtime collaboration powered by the Spaces SDK.

![Example collaboration GIF](/docs/images/collab.gif)

<p align="left">
  <a href="">
    <img src="https://badgen.net/badge/development-status/beta/yellow?icon=github" alt="Development status"   />
  </a>
  <a href="">
    <img src="https://github.com/ably/spaces/actions/workflows/dev-ci.yml/badge.svg?branch=main" alt="CI status"   />
  </a>
    <a href="">
    <img src="https://badgen.net/github/license/3scale/saas-operator" alt="License" />
  </a>
</p>

_[Ably](https://ably.com) is the scalable and five nines reliable middleware, used by developers at over 500 companies worldwide, to quickly build realtime applications - from collaborative experiences and live chat, to data broadcast and notifications. Supported by its globally distributed infrastructure, Ably offers 25 SDKs for various programming languages and platforms, as well as partner integrations with technologies including Datadog, Kafka, and Vercel, that accelerate the delivery of realtime experiences._

---




## Realtime collaboration

Rather than having to coordinate resources on calls, or send documents and spreadsheets back and forth using a combination of tools, having in-app realtime collaboration features has proven to boost productivity in remote workplaces. Such features enable end users to have contextual awareness of other users within an application. This means knowing:

### Who is in the application?

One of the most important aspects of collaboration is knowing who else you're working with. The most common way to display this is using an "Avatar Stack" to show who else is currently online, and those that have recently gone offline.

### Where is each user within the application?

Knowing where each user is within an application helps you understand their intentions without having to explicitly ask them. For example, seeing that a colleague is currently viewing slide 2 of a presentation deck means that you can carry out your own edits to slide 3 without interfering with their work. Displaying the locations of your users can be achieved by highlighting the UI element they have selected, displaying a miniature avatar stack on the slide they are viewing, or showing the live location of their cursors. In Spaces, we call this "Member Location".

### What is everyone doing in the application?

Changes to the app state made by users not only need to be synced with your backend for validation and long term storage, but also be immediately reflected in the UI so that users are always viewing the latest information. For example, in a spreadsheet application, if one user has entered a value in a cell, all other users need to see that change instantly. Pub/Sub Channels help flexibly broadcast live updates in a collaborative space.

## SDK Development Status

The Spaces SDK is currently under development. If you are interested in being an early adopter and providing feedback then you can [sign up](https://go.ably.com/spaces-early-access) for early access and are welcome to [provide us with feedback](https://go.ably.com/spaces-feedback).

The next section gives you an overview of how to use the SDK. Alternatively, you can jump to:
* [TypeDoc documentation](https://sdk.ably.com/builds/ably/spaces/main/typedoc/index.html)
* [Usage instructions](/docs/usage.md)
* [Channel behaviors](/docs/channel-behaviors.md)

## Prerequisites

To start using this SDK, you will need the following:

* An Ably account
  * You can [sign up](https://ably.com/signup) to the generous free tier.
* An Ably API key
  * Use the default or create a new API key in an app within your [Ably account dashboard](https://ably.com/dashboard).
  * Make sure your API key has the following [capabilities](https://ably.com/docs/auth/capabilities): `publish`, `subscribe`, `presence` and `history`.



## Installation and authentication

#### Option 1: Using NPM

Install the Ably JavaScript SDK and the Spaces SDK:

```sh
npm install ably @ably/spaces
```

To instantiate the Spaces SDK, create an [Ably client](https://ably.com/docs/getting-started/setup) and pass it into the Spaces constructor:

```ts
import Spaces from '@ably/spaces';
import { Realtime } from 'ably';

const client = new Realtime.Promise({ key: "<API-key>", clientId: "<client-ID>" });
const spaces = new Spaces(client);
```
You can use [basic authentication](https://ably.com/docs/auth/basic) i.e. the API Key directly for testing purposes, however it is strongly recommended that you use [token authentication](https://ably.com/docs/auth/token) in production environments.

To use Spaces you must also set a [`clientId`](https://ably.com/docs/auth/identified-clients) so that clients are identifiable. If you are prototyping, you can use a package like [nanoid](https://www.npmjs.com/package/nanoid) to generate an ID.

#### Option 2: Using a CDN

You can also use Spaces with a CDN, such as [unpkg](https://www.unpkg.com/):

```html
<script src="https://cdn.ably.com/lib/ably.min-1.js"></script>
<script src="https://cdn.ably.com/spaces/0.1.2/iife/index.bundle.js"></script>
```

After this, instantiate the SDK in the same way as in the NPM option above:

```ts
const client = new Ably.Realtime.Promise({ key: "<API-key>", clientId: "<client-ID>" });
const spaces = new Spaces(client);
```

## Creating a new Space

A space is the virtual area of your application where you want to enable synchronous collaboration. A space can be anything from a web page, a sheet within a spreadsheet, an individual slide in a slideshow, or the slideshow itself. A space has a participant state containing online and recently left members, their profile details, their locations and any locks they have acquired for the UI components.

Create a space and subscribe to any updates to the participant state.

```ts
// Create a new space
const space = await spaces.get('demoSlideshow');

// Subscribe to space state events
space.subscribe('update', (spaceState) => {
  console.log(spaceState.members);
});

// Enter a space, publishing an update event, including optional profile data
await space.enter({
  username: 'Claire Lemons',
  avatar: 'https://slides-internal.com/users/clemons.png',
});
```

The following is an example event payload received by subscribers when a user enters a space:

```json
[
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
]
```

## Space members

The `members` namespace contains methods dedicated to building avatar stacks. Subscribe to members entering, leaving, being removed from the Space (after a timeout) or updating their profile information.

```ts
// Subscribe to all member events in a space
space.members.subscribe((memberUpdate) => {
  console.log(memberUpdate);
});

// Subscribe to member enter events only
space.members.subscribe('enter', (memberJoined) => {
  console.log(memberJoined);
});

// Subscribe to member leave events only
space.members.subscribe('leave', (memberLeft) => {
  console.log(memberLeft);
});

// Subscribe to member remove events only
space.members.subscribe('remove', (memberRemoved) => {
  console.log(memberRemoved);
});

// Subscribe to profile updates on members only
space.members.subscribe('updateProfile', (memberProfileUpdated) => {
  console.log(memberProfileUpdated);
});

// Subscribe to all updates to members
space.members.subscribe('update', (memberUpdate) => {
  console.log(memberUpdate);
});
```

The following is an example event payload received by subscribers when member updates occur in a space:

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

### Getting a snapshot of space members

Space members has methods to get the current snapshot of member state:

```ts
// Get all members in a space
const allMembers = await space.members.getAll();

// Get your own member object
const myMemberInfo = await space.members.getSelf();

// Get everyone else's member object but yourself
const othersMemberInfo = await space.members.getOthers();
```

## Member locations

The `locations` namespace contains methods dedicated to building member locations, enabling you to track where users are within an application. A location could be a form field, multiple cells in a spreadsheet or a slide in a slide deck editor.

```ts
// You need to enter a space before publishing your location
await space.enter({
  username: 'Claire Lemons',
  avatar: 'https://slides-internal.com/users/clemons.png',
});

// Publish your location based on the UI element selected
await space.locations.set({ slide: '3', component: 'slide-title' });

// Subscribe to location events from all members in a space
space.locations.subscribe('update', (locationUpdate) => {
  console.log(locationUpdate);
});

```

The following is an example event payload received by subscribers when a member changes location:

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

### Getting a snapshot of member locations

Member locations has methods to get the current snapshot of member state:

```ts
// Get a snapshot of all the member locations
const allLocations = await space.locations.getAll();

// Get a snapshot of my location
const myLocation = await space.locations.getSelf();

// Get a snapshot of everyone else's locations
const othersLocations = await space.locations.getOthers();
```

## Live cursors

The `cursors` namespace contains methods dedicated to building live cursors, allowing you to track a member's pointer position updates across an application. Events can also include associated data, such as pointer attributes and the IDs of associated UI elements:

```ts
// You need to enter a space before publishing your cursor updates
await space.enter({
  username: 'Claire Lemons',
  avatar: 'https://slides-internal.com/users/clemons.png',
});

// Subscribe to events published on "mousemove" by all members
space.cursors.subscribe('update', (cursorUpdate) => {
  console.log(cursorUpdate);
});

// Publish a your cursor position on "mousemove" including optional data
window.addEventListener('mousemove', ({ clientX, clientY }) => {
  space.cursors.set({ position: { x: clientX, y: clientY }, data: { color: 'red' } });
});
```

The following is an example event payload received by subscribers when a member moves their cursor:

```js
{
  "connectionId": "hd9743gjDc",
  "clientId": "clemons#142",
  "position": { "x": 864, "y": 32 },
  "data": { "color": "red" }
}
```

### Getting a snapshot of member cursors

Member cursors has methods to get the current snapshot of member state:

```ts
// Get a snapshot of all the cursors
const allCursors = await space.cursors.getAll();

// Get a snapshot of my cursor
const myCursor = await space.cursors.getSelf();

// Get a snapshot of everyone else's cursors
const othersCursors = await space.cursors.getOthers();
```

### Component Locking

Use the Component Locking API to lock stateful components whilst being edited by members to reduce the chances of conflicting changes being made.

Locks are identified using a unique string, and the Spaces SDK maintains that at most one member holds a lock with a given string at any given time.

The Component Locking API supports four operations: Query, Acquire, Release, and Subscribe.

### Query

`space.locks.get` is used to query whether a lock identifier is currently locked and by whom. It returns a `Lock` type which has the following fields:

```ts
type Lock = {
  id: string;
  status: LockStatus;
  member: SpaceMember;
  timestamp: number;
  attributes?: LockAttributes;
  reason?: Types.ErrorInfo;
};
```

For example:

```ts
// check if the id is locked
const isLocked = space.locks.get(id) !== undefined;

// check which member has the lock
const { member } = space.locks.get(id);

// check the lock attributes assigned by the member holding the lock
const { attributes } = space.locks.get(id);
const value = attributes.get(key);
```

`space.locks.getAll` returns all lock identifiers which are currently locked as an array of `Lock`:

```ts
const allLocks = space.locks.getAll();

for (const lock of allLocks) {
  // ...
}
```

### Acquire

`space.locks.acquire` sends a request to acquire a lock using presence.

It returns a Promise which resolves once the presence request has been sent.

```ts
const req = await space.locks.acquire(id);

// or with some attributes
const attributes = new Map();
attributes.set('key', 'value');
const req = await space.locks.acquire(id, { attributes });
```

It throws an error if a lock request already exists for the given identifier with a status of `pending` or `locked`.

### Release

`space.locks.release` releases a previously requested lock by removing it from presence.

It returns a Promise which resolves once the presence request has been sent.

```ts
await space.locks.release(id);
```

### Subscribe

`space.locks.subscribe` subscribes to changes in lock status across all members.

The callback is called with a value of type `Lock`.

```ts
space.locks.subscribe('update', (lock) => {
  // lock.member is the requesting member
  // lock.request is the request made by the member
});

// or with destructuring:
space.locks.subscribe('update', ({ member, request }) => {
  // request.status is the status of the request, one of PENDING, LOCKED, or UNLOCKED
  // request.reason is an ErrorInfo if the status is UNLOCKED
});
```

Such changes occur when:

- a `pending` request transitions to `locked` because the requesting member now holds the lock
- a `pending` request transitions to `unlocked` because the requesting member does not hold the lock since another member already does
- a `locked` request transitions to `unlocked` because the lock was either released or invalidated by a concurrent request which took precedence
- an `unlocked` request transitions to `locked` because the requesting member reacquired a lock
