# Ably Spaces

**This is an experimental API, not meant for production usage.**

If you have any feedback or are interested in what we are doing please [contact us](https://ably.com/contact).

API for managing and accessing Ably Spaces.

**Class definitions are available [here](/docs/class-definitions.md).**

### Usage

To use the Space API, you'll need to have an Ably client already set up and authenticated.
To get started quickly, you can use [basic authentication](https://ably.com/docs/realtime/authentication#basic-authentication)
by creating an API key with the **publish**, **subscribe** and **presence** capabilities enabled.


Here's an example of how you can create a new instance of the client and pass it to the Spaces constructor:

```ts
import { Realtime } from 'ably/promise';
import Spaces from '@ably-labs/spaces';

const client = new Realtime(ABLY_API_KEY);
const spaces = new Spaces(client);
```

A new space can then be created and entered:

```ts
const space = spaces.get("mySpace");
space.enter({
  username: "Example User",
  avatar: "https://example.com/users/1234.png",
});
```

The membersUpdate event will fire when a member's connection status updates, e.g. when a member joins or leaves the space:

```ts
space.on('membersUpdate', (members) => {
  console.log(members);
});
```
This code would output the following in console when `space.enter` is called:

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
