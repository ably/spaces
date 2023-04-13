![development-status](https://badgen.net/badge/development-status/alpha/yellow?icon=github)

# Multiplayer Collaboration

[Ably](https://ably.com/) is the platform that powers realtime experiences at scale, including live chat, data broadcast, notifications, audience engagement and collaboration.

Multiplayer Collaboration enables virtual teams to work together efficiently by having the contextual awareness of who else is currently with them on the app, where exactly they are and the updates they are making. With the **Ably Collaborative Spaces SDK**, we are on a mission to make it easy for developers to add Multiplayer Collaboration features to any web application, in a few lines of code.

![Multiplayer Collaboration Demo](https://user-images.githubusercontent.com/5900152/225328262-2b63bb49-57a0-4f40-b78e-b87565f4c98c.png)

> **Note**
> The **Ably Collaborative Spaces** SDK is a work in progress and is currently meant for early adopters to trial and test out while some features are still under development.

> If you are interested in seeing new API features that are still under development, [sign up for exclusive early access](https://go.ably.com/spaces-early-access). If you have any feedback or feature requests, [please fill out this form](https://go.ably.com/spaces-feedback) or reach out to us at [beta@ably.com](mailto:beta@ably.com).

## Overview

Built as an extension to the [existing Ably-JS SDK](https://github.com/ably/ably-js), the Ably Collaborative Spaces SDK enables multiplayer collaboration in any web application through the creation of spaces. 

A space is a virtual collaborative location consisting of users and storage with persistent presence, enabling shared realtime digital experiences such as chat, reactions and collaborative editing. You can set up a collaborative space and subscribe to different kinds of updates to see who else is in the space with you, their live location within the application and any updates they are making.

### Glossary

1. Space: A virtual collaborative space where members can collaborate in realtime with each other.
2. Members: Users connected to the virtual collaborative space. The same user (identified by the clientId) can be present multiple times via different connections.
3. Avatar Stack: A visual representation of the currently present and recently left list of members in the collaborative space. This is usually presented as a stack of profile pictures or initials along with other profile information such as name or role.
4. (Coming soon) User Location: The live location of a member within the app. Depending on the nature of the app, this could be a slide number, a URL, a cell id, component id, etc.
5. (Coming soon) Live cursor: The pointer location of a member within the app.

**Class definitions are available [in the docs folder](/docs/class-definitions.md).**

## Usage guidance

### Setup

To use the Ably Collaborative Spaces SDK, you'll need to have an Ably JS client set up and authenticated. To get started quickly, you can use [basic authentication](https://ably.com/docs/realtime/authentication#basic-authentication) which only requires an Ably API Key.

1. [Sign up to a free Ably account](https://ably.com/signup)
2. [Get your API Key](https://faqs.ably.com/setting-up-and-managing-api-keys) with publish, subscribe and presence capabilities enabled.

Create a new instance of the promise version of realtime client and pass that as a parameter to the Spaces constructor:

```ts
import { Realtime } from 'ably/promise';
import Spaces from '@ably-labs/spaces';

const client = new Realtime(ABLY_API_KEY);
const spaces = new Spaces(client);
```

### Create or retrieve a space

A `Space` instance can be created, or an existing space retrieved using the `get()` method. You can connect to multiple spaces, but only once per `get()` operation. Spaces are identified by their unique, unicode string name.

You can pass an `offlineTimeout` option when creating a space to specify the length of time in milliseconds after a member loses their connection before that member's object is removed from the space. The default is 120,000ms (2 minutes).

The following is an example of creating a space with the default `offlineTimeout`:

```ts
const space = spaces.get("exampleSpace");
```

### Enter or leave a space

A space can be entered using the `enter()` method. The request can contain an optional `profileData` JSON-serializable object. On entering a space any clients subscribed to that space's `membersUpdate` will be notified of the new member and associated `profileData`.

The following is an example of entering a space with some basic profile data:

```ts
space.enter({
  username: "Example User",
  avatar: "https://example.com/users/1234.png",
});
```

A `Space` can be left using the `leave()` method. On leaving a space any clients subscribed to that space's `membersUpdate` will be notified.

The following is an example of leaving a space:

```ts
space.leave();
```

### Realtime space updates

You can subscribe to realtime events by using `on(event, callback)`. Currently the only supported events are `membersUpdate()` and `locationUpdate()`.

#### Subscribe to member updates

Member data can be used to track events relating to a user, for example when a member joins or leaves a space.

To receive updates from members in a space you can subscribe to that space's `membersUpdate`. The `membersUpdate` event will trigger when a member's connection status updates. The response returns an array of the current `SpaceMember` objects within that space.

The `SpaceMember` object consists of:

| Property    | Type                              |
|-------------|-----------------------------------|
| clientId  	| string                            |
| isConnected	| bool                              |
| lastEvent	  | {name: string, timestamp: number} |
| location    | Any                               |
| profileData	| Object                            |

A member's object will still be returned after disconnection for the length of the `offlineTimeout` provided when creating a space. The default is 120,000ms (2 minutes).

The following is an example of subscribing to `membersUpdate`: 

```ts
space.on('membersUpdate', (members) => {
  console.log(members);
});
```

The following is an example of the response received when a member enters the space with `space.enter()`:

```json
[
  {
    "clientId": "user1",
    "isConnected": true,
    "lastEvent": {
      "name": "enter",
      "timestamp": 1678886130000
    },
    "location": null,
    "profileData": {
      "username": "Example User",
      "avatar": "https://example.com/users/1234.png"
    }
  }
]
```

The following is an example of the response sent by subscribing to `membersUpdate` when a member has left the space by calling `space.leave()`, closing the application or has been disconnected for less than 2 minutes (default `offlineTimeout` setting):

```json
[
  {
    "clientId": "user1234",
    "isConnected": false,
    "location": null,
    "lastEvent": {
      "name": "leave",
      "timestamp": 1678890015000
    },
  }
]
```

#### Subscribe to locations

Location data can be used to collect a variety of data which can be used to create UI elements representing a user's location. For example, showing a user's visual location on a page, their active URL, or anything else showing where a user is active in an application.

To receive location updates from members in a space you can subscribe to that space's `locationUpdate`. The `locationUpdate` event will trigger when a member's location updates. 

The response returns an object consisting of the following fields:

| Property         | Type                        |
|------------------|-----------------------------|
| member           | SpaceMember                 |
| currentLocation  | Any                         |
| previousLocation | Any                         |

Locations are updated with `set(locations)` to trigger a `locationUpdate` event for all connected clients in a space. Location can be any JSON-serializable object.

| Property | Type |
|----------|------|
| location | Any  |

### One off space requests

Spaces can be queried for one off requests in the following ways:

* `getMembers()` - returns an array of all `SpaceMember` objects currently in the space, including any members who have left and not yet timed out.
* `getSelf()` - returns the `SpaceMember` object which relates to the local client.

## Example Applications

You can find an example repository of "Collaborative Spaces here":https://github.com/ably-labs/spaces/tree/tutorial-branch. 

### Avatar stack

An avatar stack is a UI element showing a visual representation of current and recently left members in a collaborative space. Typically this is presented as a stack of profile pictures or initials along with other profile information such as name or role.

To create an avatar stack you would subscribe to the `membersUpdate` for a specific space:

```ts
space.on('membersUpdate', (members) => {
  console.log(members);
});
```

From this you can retrieve the `profileData` to get a member's `profileData`, such as their username and avatar:

```ts
const showMembers = members.slice(0, 5);

showMembers.forEach((member, index) => {
  const li = document.createElement('li');
  li.classList.add('ml-[-9px]', 'relative');
  li.appendChild(renderAvatar(member, index));
  ul.appendChild(li);
});
```

This information can then be rendered into your application.

We have created a [live working example](:https://spaces-demo.netlify.app/?space=nearby-lips-familiar) of an avatar stack for you to view.