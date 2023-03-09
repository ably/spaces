# Multiplayer Collaboration
[Ably](https://ably.com/) is the platform that powers realtime experiences at scale, including live chat, data broadcast, notifications, audience engagement and collaboration. With the Spaces library, we are on a mission to make it easy for developers to add Multiplayer Collaboration features to any web application, in a few lines of code.

# Ably Spaces

This repository contains an API for managing and accessing Ably Spaces. Please note that this is an experimental API. You can try it out by following the usage instructions below.

If you have any feedback or are interested in what we are doing please reach out to us at [beta@ably.com](mailto:beta@ably.com).

## Concepts
The Ably Spaces library provides purpose-built methods and properties to enable multiplayer collaboration in any web application. You can set up a collaborative "space" and subscribe to different kind of updates to see who else is in the space with you, their live location within the app and any updates they are making.

This library is built as an extension to our [existing JS SDK](https://github.com/ably/ably-js), so you'll need an Ably JS client to be able to use this library. The usage instructions will help you set that up.

### Glossary
As part of this library, we are introducing some new concepts:

1. Space: A virtual collaborative space where members can collaborate in realtime with each other.
2. Members: Users connected to the virtual collaborative space. The same user (identified by the clientId) can be present multiple times via different connections.
3. Avatar Stack: A visual representation of the currently present and recently left list of members in the collaborative space. This is usually presented as a stack of profile pictures or initials along with other profile information such as name or role.
3. (Coming soon) User Location: The live location of a member within the app. Depending on the nature of the app, this could be a slide number, a URL, a cell id, component id, etc.
4. (Coming soon) Live cursor: The pointer location of a member within the app. 


## Usage

### Pre-requisites

To use the Space API, you'll need to have an Ably JS client set up and authenticated. To get started quickly, you can use [basic authentication](https://ably.com/docs/realtime/authentication#basic-authentication) which only requires an Ably API Key. 

1. [Sign up to a free Ably account](https://ably.com/signup)
2. [Get your API Key](https://faqs.ably.com/setting-up-and-managing-api-keys) with publish, subscribe and presence capabilities enabled.

### Quickstart 

Create a new instance of the promise version of realtime client and pass that as a parameter to the Spaces constructor:

```ts
import { Realtime } from 'ably/promise';
import Spaces from '@ably-labs/spaces';

const client = new Realtime(ABLY_API_KEY);
const spaces = new Spaces(client);
```

Create a new space instance and have members enter that space:

```ts
const space = spaces.get("mySpace");
space.enter({
  username: "Example User",
  avatar: "https://example.com/users/1234.png",
});
```

Subscribe to updates from other members in the space. The `membersUpdate` event will fire when a member's connection status updates, e.g. when a member joins or leaves the space:

```ts
space.on('membersUpdate', (members) => {
  console.log(members);
});
```

### Example payload returned

1. When a member has entered the space via `space.enter()`:

```json
[
  {
    "clientId": "user1234",
    "isConnected": true,
    "lastEvent": {
      "name": "enter",
      "timestamp": 1677595689759
    },
    "profileData": {
      "username": "Example User",
      "avatar": "https://example.com/users/1234.png"
    }
  }
]
```

2. When a member has left the space in one of the following ways:
- called `space.leave()`
- has closed the tab
- abruptly disconnected from the internet for more than 2min (which is configurable via [`offlineTimeout`](https://github.com/ably-labs/spaces/blob/main/docs/class-definitions.md#offlinetimeout):

```json
[
  {
    "clientId": "user1234",
    "isConnected": false,
    "lastEvent": {
      "name": "enter",
      "timestamp": 1677595689759
    },
    "profileData": {
      "username": "Example User",
      "avatar": "https://example.com/users/1234.png"
    }
  }
]
```

**Class definitions are available [in the docs folder](/docs/class-definitions.md).**
