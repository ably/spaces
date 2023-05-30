![development-status](https://badgen.net/badge/development-status/alpha/yellow?icon=github)

# Ably

_[Ably](https://ably.com/) is the platform that powers realtime experiences at scale, including live chat, data broadcast, notifications, audience engagement and collaboration._

## Collaborative Spaces SDK

The Collaborative Spaces SDK enables you to implement realtime collaborative features in your applications. Rather than having to coordinate resources on calls, or send documents and spreadsheets back and forth using a combination of tools, having in-app realtime collaboration features has proven to boost productivity in remote workplaces.

![ably-multiplayer-collaboration-solutions](https://github.com/ably-labs/spaces/assets/5900152/533d23cb-d943-4230-8d86-1981ccc31a8a)

Realtime collaboration enables users to have contextual awareness of other users within an application. This means knowing:

### Who is in the application?

One of the most important aspects of collaboration is knowing who else you're working with. The most common way to display this is using an "Avatar Stack" to show who else is currently online, and those that have recently gone offline.

### Where is each user within the application?

Knowing where each user is within an application helps you understand their attentions without always needing to explicitly ask them. For example, seeing that a colleague is currently viewing slide 2 of a slideshow means that you can carry out your own edits to slide 3 without interfering with their work. Displaying the locations of your users can be achieved by highlighting the UI element they have selected, displaying a miniature avatar stack on the slide they are viewing, or showing the live location of their cursors.

### What is everyone doing in the application?

Seeing where users are within an application aids in understanding what they may be working on. It's possible to go one step further though and see what changes they're making to an application. For example, you can display a typing indicator when a colleague is editing a cell in a spreadsheet, or even update the contents of the cell as they type it.

## Development status

The Collaborative Spaces SDK is currently under development. 

If you are interested in being an early adopter and providing feedback then you can [sign up](https://go.ably.com/spaces-early-access) for early access and are welcome to [provide us any feedback](https://go.ably.com/spaces-feedback).

## Concepts

### Collaborative Spaces

To make an application collaborative using the Collaborative Spaces SDK, you first create a `space`. A space is the virtual collaborative area of an application you want to monitor. A space can be anything from a web page, a sheet within a spreadsheet, an individual slide in a slideshow, or the slideshow itself.

### Avatar Stack

![Avatar stack image](/docs/images/avatar-stack.png)

 Once a space has been defined, users can enter that space and register their details. Subscribing to updates from a space will notify you of when anyone joins or leaves the space.

### User Location

![User Location](/docs/images/user-location.png)

To display the live location of users within an application using the Collaborative Spaces SDK, you utilize a `space`. You can set and track locations of users using the locations API and subscribe to events for when they move. You can track cursors within a space using the cursors API, and similarly subscribe to events for when they move.

### Live Updates

![Live Updates](/docs/images/live-updates.png)

The Collaborative Spaces SDK is built as an extension to the existing [Ably JavaScript SDK](https://github.com/ably/ably-js). This means that it is possible to utilize the existing pub/sub functionality available with Ably in a collaborative application to track what users are doing. In the previous example, when a user is updating the contents of a cell or field you can use a [channel](https://ably.com/docs/realtime/channels) to show the new contents to other users as it's being typed.


## Getting started

Use the following snippets to quickly get up and running. More detailed [usage instructions](/docs/usage.md) are available, as are [class definitions](/docs/class-definitions.md) and information on [channel behavior](/docs/channel-behaviors.md).

You can also view a [live demo](https://space.ably.dev) which uses an example slideshow to demonstrate updating an avatar stack, displaying user locations and live cursors.

### Prerequisites

To begin, you will need the following:

* An Ably account. You can [sign up](https://ably.com/signup) for free.
* An Ably API key. You can create API keys in an app within your [Ably account](https://ably.com/dashboard).
  * The API key needs the following [capabilities](https://ably.com/docs/realtime/authentication#capabilities-explained): `publish`, `subscribe`, `presence` and `history`.

You can use [basic authentication](https://ably.com/docs/realtime/authentication#basic-authentication) for testing purposes, however it is strongly recommended that you use [token authentication](https://ably.com/docs/realtime/authentication#token-authentication) in any production environments.

### Authenticate and instantiate

Install the Ably JavaScript SDK and the Collaborative Spaces SDK:

```sh
npm install ably ably-labs/spaces
```

Import the SDKs and then instantiate the Collaborative Spaces SDK with your Ably API key:

```ts
import { Realtime } from 'ably/promise';
import Spaces from '@ably-labs/spaces';

const spaces = new Spaces(ABLY_API_KEY);
```

In the above example, the client can be accessed using `spaces.ably` to use functionality in the Ably JavaScript SDK.

### Space membership

A space is the virtual collaborative area of an application you want to monitor. A space can be anything from a web page, a sheet within a spreadsheet, an individual slide in a slideshow, or the slideshow itself. Create a space and subscribe to events for when clients enter and leave it. Space membership is used to build avatar stacks and display which members are online within a space.

```ts
// Create a new space
const space = spaces.get('demoSlideshow');

// Register a listener to subscribe to events of when users enter or leave the space
space.on('membersUpdate', (members) => {
  console.log(members);
});

// Enter a space, publishing a memberUpdate event, including optional user data
space.enter({
  username: "Claire Lemons",
  avatar: "https://slides-internal.com/users/clemons.png",
});
```

The following is an example `membersUpdate` event received by subscribers when a user enters a space:

```json
[
  {
    "clientId": "clemons#142",
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

### Location updates

User locations enable you to track where clients are within an application. Subscribe to all location updates, those for a specific location, such as a single UI element, or a specific client.

```ts
// Register a listener to subscribe to events of when users change location
space.locations.on('locationUpdate', (update) => {
  console.log(update);
});

// Publish locationUpdate event with a client's location when they select a UI element or change web pages
space.locations.set({slide: '3', component: 'slide-title'});

// Create a tracker to only publish locationUpdate events for a specific user using their clientId
const memberTracker = space.locations.createTracker(
  (change) => change.member.clientId === 'clemons#142'
);

// Register a listener to subscribe to events for a tracker
memberTracker.on((change) => {
  console.log(change);
});

// Create a tracker to only publish locationUpdate events for a specific location, such as a UI element or spreadsheet cell
const locationTracker = space.locations.createTracker(
  (change) => change.previousLocation === 'slide-title'
);

// Register a listener to subscribe to events for a tracker
locationTracker.on((change) => {
  console.log(change);
});
```

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

### Cursor locations

Use cursors to track client cursors across an application. Subscribe to updates for all cursors, or only a specific client's cursor.

```ts
// Create a new cursor instance
const pointer = space.cursors.get('space-pointers');

// Retrieve the initial position of all cursors, returning a positionsUpdate for each client
const allCursors = space.cursors.getAll();

// Publish a positionUpdate with the location of a pointer, including optional data 
pointer.set({ position: { x: clientX, y: clientY }, data: { color: 'red' } });

// Register a listener to subscribe to all cursor events
space.cursors.on((event) => {
  console.log(event);
});

space.cursors.on('cursorsUpdate', (event) => {
  console.log(event);
});

// Register a listener to subscribe to a specific cursor
space.cursors.get('space-pointers').on(() => {});
```

The following is an example `positionUpdate` received by subscribers when a cursor moves:

```json
{
  "name": "clemons-pointer",
  "connectionId": "hd9743gjDc",
  "clientId": "clemons#142",
  "position": { "x": 864, "y": 32 },
  "cursorData": { "color": "red" }
}
```
