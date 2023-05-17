![development-status](https://badgen.net/badge/development-status/alpha/yellow?icon=github)

# Ably

_[Ably](https://ably.com) is the platform that powers synchronized digital experiences in realtime. Whether attending an event in a virtual venue, receiving realtime financial information, or monitoring live car performance data – consumers simply expect realtime digital experiences as standard. Ably provides a suite of APIs to build, extend, and deliver powerful digital experiences in realtime for more than 250 million devices across 80 countries each month. Organizations like Bloomberg, HubSpot, Verizon, and Hopin depend on Ably’s platform to offload the growing complexity of business-critical realtime data synchronization at global scale. For more information, see the [Ably documentation](https://ably.com/docs)._

## Collaborative Spaces SDK

The Collaborative Spaces SDK enables you to implement realtime collaborative features in your applications. The requirement to have multiplayer collaboration in applications has only been increasing in recent years. Rather than having to coordinate resources on calls, or send documents and spreadsheets back and forth, features that make collaborating in realtime are becoming a necessity rather than a nice-to-have.

The main three features that you need to make your application collaborative are:

* Who is in the application?
* Where is each user within the application?
* What is everyone doing in the application?

![Multiplayer Collaboration Demo](https://user-images.githubusercontent.com/5900152/225328262-2b63bb49-57a0-4f40-b78e-b87565f4c98c.png)

### Who is in the application?

To make an application collaborative you first create a `space`. A space is the virtual area of an application you want to monitor. A space can be anything from a web page, a sheet within a spreadsheet, an individual slide in a slideshow, or the slideshow itself.

Once a space has been defined, users can enter that space and register their details. Subscribing to `membersUpdate` will notify you of when anyone joins or leaves the space. The most common way to display this is an avatar stack.

### Where is each user within the application?

To display the live location of each user within an application you again utilize a space. You can show where a user is by highlighting the UI element that they have selected, showing that a cell within a spreadsheet has been clicked on, or showing cursors moving across a page.

To show users interacting with UI elements or spreadsheet cells, you can set and track locations using the locations API. Subscribing to `locationUpdate` events will notify all subscribers of any changes in user locations.

To display cursors for users within a space, use the cursors API. Subscribing to `positionsUpdate` events will update the location of cursors within an application for all users.

### What is everyone doing in the application?

The Collaborative Spaces SDK is built as an extension to the existing [Ably JavaScript SDK](https://github.com/ably/ably-js). This means that it is possible to utilize the existing pub/sub functionality available with Ably in a collaborative application to track what users are doing. For example, when a user is updating the contents of a cell or field you can use a [channel](https://ably.com/docs/realtime/channels) to show the new contents to other users as it's being typed.

## Development status

The Collaborative Spaces SDK is currently under development. 

If you are interested in being an early adopter and providing feedback then you can [sign up](https://go.ably.com/spaces-early-access) for early access and are welcome to [provide us any feedback](https://go.ably.com/spaces-feedback).

## Getting started

Use the following snippets to quickly get up and running. More detailed [usage instructions](/docs/usage.md) are available, as are [class definitions](/docs/class-definitions.md) and information on [channel behavior](/docs/channel-behaviors.md).

You can also view a [live demo](https://spaces-demo.netlify.app/?space=nearby-lips-familiar). This uses an example slideshow to demonstrate updating an avatar stack and displaying user locations.

### Prerequisites

To begin, you will need the following:

* An Ably account. You can [sign up](https://ably.com/signup) for free.
* An Ably API key. You can create API keys in an app within your [Ably account](https://ably.com/dashboard).
  * The API key needs the following [capabilities](https://ably.com/docs/realtime/authentication#capabilities-explained): `publish`, `subscribe`, `presence` and `history`.

You can use [basic authentication](https://ably.com/docs/realtime/authentication#basic-authentication) for testing purposes, however it is strongly recommended that you use [token authentication](https://ably.com/docs/realtime/authentication#token-authentication) in any production environments.

### Authenticate and instantiate

Import the Ably JavaScript SDK and the Collaborative Spaces SDK. Create an instance of the Ably JavaScript SDK using your Ably API key and then pass that value to the Collaborative Spaces SDK constructor:

```ts
import { Realtime } from 'ably/promise';
import Spaces from '@ably-labs/spaces';

const client = new Realtime(ABLY_API_KEY);
const spaces = new Spaces(client);
```

### Space membership

A space is the virtual area of an application you want to monitor, such as a web page, or slideshow. Create a space and subscribe to events for when clients enter and leave it. Space membership is used to build avatar stacks and display which members are online within a space.

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

### Location updates

Locations enable you to track where clients are within an application. Subscribe to all location updates, those for a specific location, such as a single UI element, or a specific client.

```ts
// Register a listener to subscribe to events of when users change location
space.locations.on('locationUpdate', (update) => {
  console.log(update);
});

// Publish locationUpdate event with a client's location when they select a UI element or change web pages
space.locations.set({slide: '3', component: 'slide-title'});

// Create a tracker to only publish locationUpdate events for a specific user using their clientId
const memberTracker = space.locations.createTracker(
  (change) => change.member.clientId === 'clemons@slides.com'
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
  "clientId": "clemons@slides.com",
  "position": { "x": 864, "y": 32 },
  "cursorData": { "color": "red" }
}
```
