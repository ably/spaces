## Space API Documentation

Contents

- [Usage](#usage)
- [Class Definitions](class-definitions.md)
  - [Spaces](class-definitions.md#spaces)
  - [Space](class-definitions.md#space)
  - [SpaceMember](class-definitions.md#spacemember)

### Usage

To use the Space API, you'll need to have an Ably client already set up.
Here's an example of how you can create a new instance of the client and pass it to the Spaces constructor:

```ts
import { Realtime } from 'ably/promise';
import Spaces from '@ably-labs/spaces';

const client = new Realtime(process.env.ABLY_KEY);
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

Enter and leave events can be listened to by creating an event listener:

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

