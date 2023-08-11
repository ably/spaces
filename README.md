# Ably Collaborative Spaces SDK

<p align="left">
  <a href="">
    <img src="https://badgen.net/badge/development-status/alpha/yellow?icon=github" alt="Development status"   />
  </a>
  <a href="">
    <img src="https://github.com/ably-labs/spaces/actions/workflows/dev-ci.yml/badge.svg?branch=main" alt="CI status"   />
  </a>
    <a href="">
    <img src="https://badgen.net/github/license/3scale/saas-operator" alt="License" />
  </a>
</p>

The [Ably](https://ably.com) Collaborative Spaces SDK enables you to implement realtime collaborative features in your applications. 

![Example collaboration GIF](/docs/images/collab.gif)

Rather than having to coordinate resources on calls, or send documents and spreadsheets back and forth using a combination of tools, having in-app realtime collaboration features has proven to boost productivity in remote workplaces. Try out a [live demo](https://space.ably.dev) of a slideshow application for an example of realtime collaboration in action.

Realtime collaboration enables users to have contextual awareness of other users within an application. This means knowing:

**Who is in the application?**

One of the most important aspects of collaboration is knowing who else you're working with. The most common way to display this is using an "Avatar Stack" to show who else is currently online, and those that have recently gone offline.

**Where is each user within the application?**

Knowing where each user is within an application helps you understand their intentions without having to explicitly ask them. For example, seeing that a colleague is currently viewing slide 2 of a slideshow means that you can carry out your own edits to slide 3 without interfering with their work. Displaying the locations of your users can be achieved by highlighting the UI element they have selected, displaying a miniature avatar stack on the slide they are viewing, or showing the live location of their cursors.

**What is everyone doing in the application?**

Changes to the app state made by users not only need to be synced with your backend for validation and long term storage, but also be immediately reflected in the UI so that users are always viewing the latest information. For example, in a spreadsheet application, if one user has entered a value in a cell, all other users need to see that change instantly. Live updates help accomplish this in a collaborative space.

## Status

The Collaborative Spaces SDK is currently under development. If you are interested in being an early adopter and providing feedback then you can [sign up](https://go.ably.com/spaces-early-access) for early access and are welcome to [provide us with feedback](https://go.ably.com/spaces-feedback).

## Quickstart

Get started quickly using this section, or take a look at:

* more detailed [usage instructions](/docs/usage.md)
* [class definitions](/docs/class-definitions.md)  
* how the Spaces SDK uses [Ably internally](/docs/channel-behaviors.md)

### Prerequisites

To begin, you will need the following:

* An Ably account. You can [sign up](https://ably.com/signup) for free.
* An Ably API key. You can create API keys in an app within your [Ably account](https://ably.com/dashboard).
  * The API key needs the following [capabilities](https://ably.com/docs/auth/capabilities): `publish`, `subscribe`, `presence` and `history`.

You can use [basic authentication](https://ably.com/docs/auth/basic) for testing purposes, however it is strongly recommended that you use [token authentication](https://ably.com/docs/auth/token) in production environments.

### Authenticate and instantiate

Install the Collaborative Spaces SDK and the Ably JavaScript SDK:

```sh
npm install ably @ably-labs/spaces
```

To instantiate the Spaces SDK, create an [Ably client](https://ably.com/docs/getting-started/setup) and pass it into the Spaces constructor:

```ts
import Spaces from '@ably-labs/spaces';
import { Realtime } from 'ably';

const client = new Realtime.Promise({key: "<API-key>", clientId: "<client-ID>"});
const spaces = new Spaces(client);
```

You can create an Ably client with just an API key, however to use Spaces you must also set a [`clientId`](https://ably.com/docs/auth/identified-clients) so that clients are identifiable. If you are prototyping, you can use a package like [nanoid](https://www.npmjs.com/package/nanoid) to generate an ID.

#### CDN

You can also use Spaces with a CDN, such as [unpkg](https://www.unpkg.com/):

```html
<script src="https://cdn.ably.com/lib/ably.min-1.js"></script>
<script src="https://unpkg.com/@ably-labs/spaces@0.0.10/dist/iife/index.bundle.js"></script>
```

### Space membership

A space is the virtual, collaborative area of an application you want to monitor. A space can be anything from a web page, a sheet within a spreadsheet, an individual slide in a slideshow, or the slideshow itself. Create a space and listen for events to see when clients enter and leave.

Space membership is used to build avatar stacks and find out which members are online within a space.

```ts
// Create a new space
const space = await spaces.get('demoSlideshow');

// Register a listener to subscribe to events of when users enter or leave the space
space.on('membersUpdate', (members) => {
  console.log(members);
});

// Enter a space, publishing a memberUpdate event, including optional profile data
space.enter({
  username: 'Claire Lemons',
  avatar: 'https://slides-internal.com/users/clemons.png',
});
```

The following is an example `membersUpdate` event received by listeners when a user enters a space:

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

### Location

Member locations enable you to track where users are within an application. A location could a form field, multiple cells in a spreadsheet or a slide in a slide deck editor. Subscribe to all location updates, specific location, or locations changes for a given member.

```ts
// Register a listener to subscribe to events of when users change location
space.locations.on('locationUpdate', (locationUpdate) => {
  console.log(locationUpdate);
});

// You need to enter a space before setting your location
space.enter({
  username: 'Claire Lemons',
  avatar: 'https://slides-internal.com/users/clemons.png',
});

// Publish locationUpdate event with a client's location when they select a UI element
space.locations.set({ slide: '3', component: 'slide-title' });

<<<<<<< HEAD
// Create a tracker to only publish locationUpdate events for a specific user using their clientId
const memberTracker = space.locations.createTracker(
  (locationUpdate) => locationUpdate.member.clientId === 'clemons#142',
);

// Register a listener to subscribe to events for a tracker
memberTracker.on((locationUpdate) => {
  // will only trigger if change.member.clientId === 'clemons#142'
  console.log(locationUpdate);
});
```

=======
>>>>>>> d4fd85e (chore: Update docs related to tracker)
The following is an example `locationUpdate` event received by subscribers when a user changes location:

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

### Cursors

Use the Cursors API to track client pointer events across an application. Events can also include associated data, such as pointer attributes and the IDs of associated UI elements:

```ts
// You need to enter a space before setting your cursor updates
space.enter({
  username: 'Claire Lemons',
  avatar: 'https://slides-internal.com/users/clemons.png',
});

// Publish a CursorUpdate with the location of a mouse, including optional data for the current member
window.addEventListener('mousemove', ({ clientX, clientY }) => {
  space.cursors.set({ position: { x: clientX, y: clientY }, data: { color: 'red' } });
});


// Listen to events published on "mousemove" by all members
space.cursors.on('cursorsUpdate', (cursorUpdate) => {
  console.log(cursorUpdate);
});
```

The above listener will receive a `CursorUpdate` event:

```js
{
  "connectionId": "hd9743gjDc",
  "clientId": "clemons#142",
  "position": { "x": 864, "y": 32 },
  "data": { "color": "red" }
}
```
