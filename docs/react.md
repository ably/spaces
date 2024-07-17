# React Hooks

> [!NOTE]
> For more information about React Hooks for Spaces, please see the official [Spaces documentation](https://ably.com/docs/spaces/react).

Incorporate Spaces into your React application with idiomatic and user-friendly React Hooks.

Using this module you can:

- Interact with [Ably Spaces](https://ably.com/docs/spaces) using a React Hook.
- Subscribe to events in a space
- Retrieve the membership of a space
- Set the location of space members
- Acquire locks on components within a space
- Set the position of members' cursors in a space

---

- [Compatible React Versions](#compatible-react-versions)
- [Usage](#usage)
    + [useSpace](#usespace)
    + [useMembers](#usemembers)
    + [useLocation](#uselocation)
    + [useLocks](#uselocks)
    + [useLock](#uselock)
    + [useCursors](#usecursors)
    + [Error Handling](#error-handling)

---

## Compatible React Versions

The hooks are compatible with all versions of React above 16.8.0

## Usage

Start by connecting your app to Ably using the `SpacesProvider` component.

The `SpacesProvider` should wrap every component that needs to access Spaces.

```jsx
import { Realtime } from "ably";
import Spaces from "@ably/spaces";
import { SpacesProvider, SpaceProvider } from "@ably/spaces/react";

const ably = new Realtime({ key: "your-ably-api-key", clientId: 'me' });
const spaces = new Spaces(ably);

root.render(
  <SpacesProvider client={spaces}>
    <SpaceProvider name="my-space">
      <App />
    </SpaceProvider>
  </SpacesProvider>
)
```

Once you've done this, you can use the `hooks` in your code. The simplest example is as follows:

```javascript
const { self, others } = useMembers();
```

Our react hooks are designed to run on the client-side, so if you are using server-side rendering, make sure that your components which use Spaces react hooks are only rendered on the client side.

---

### useSpace

The `useSpace` hook lets you subscribe to the current Space and receive Space state events and get the current Space instance.

```javascript
const { space } = useSpace((update) => {
  console.log(update);
});
```

### useMembers

The `useMembers` hook is useful in building avatar stacks. By using the `useMembers` hook you can retrieve members of the space.
This includes members that have recently left the space, but have not yet been removed.

```javascript
const { self, others, members } = useMembers();
```

* `self` - a member’s own member object
* `others` - an array of member objects for all members other than the member themselves
* `members` - an array of all member objects, including the member themselves

It also lets you subscribe to members entering, leaving, being
removed from the Space (after a timeout) or updating their profile information.

```javascript
// Subscribe to all member events in a space
useMembers((memberUpdate) => {
  console.log(memberUpdate);
});

// Subscribe to member enter events only
useMembers('enter', (memberJoined) => {
  console.log(memberJoined);
});

// Subscribe to member leave events only
useMembers('leave', (memberLeft) => {
  console.log(memberLeft);
});

// Subscribe to member remove events only
useMembers('remove', (memberRemoved) => {
  console.log(memberRemoved);
});

// Subscribe to profile updates on members only
useMembers('updateProfile', (memberProfileUpdated) => {
  console.log(memberProfileUpdated);
});

// Subscribe to all updates to members
useMembers('update', (memberUpdate) => {
  console.log(memberUpdate);
});
```

### useLocation

The `useLocation` hook lets you subscribe to location events.
Location events are emitted whenever a member changes location.

```javascript
useLocation((locationUpdate) => {
  console.log(locationUpdate);
});
```

`useLocation` also enables you to update current member location by using `update` method provided by hook. For example:

```javascript
const { update } = useLocation((locationUpdate) => {
  console.log(locationUpdate);
});
```

### useLocks

`useLocks` enables you to subscribe to lock events by registering a listener. Lock events are emitted whenever a lock transitions into the `locked` or `unlocked` state.

```javascript
useLocks((lockUpdate) => {
  console.log(lockUpdate);
});
```

### useLock

`useLock` returns the status of a lock and, if the lock has been acquired, the member holding that lock.

```javascript
const { status, member } = useLock('my-lock');
```

### useCursors

`useCursors` enables you to track a member's cursor position and provide a view of all members' cursors within a space. For example:

```javascript
// Subscribe to events published on "mousemove" by all members
const { set } =  useCursors((cursorUpdate) => {
  console.log(cursorUpdate);
});

useEffect(() => {
  // Publish a your cursor position on "mousemove" including optional data
  const eventListener = ({ clientX, clientY }) => {
    set({ position: { x: clientX, y: clientY }, data: { color: 'red' } });
  }

  window.addEventListener('mousemove', eventListener);

  return () => {
    window.removeEventListener('mousemove', eventListener);
  };
});
```

If you provide `{ returnCursors: true }` as an option you can get active members cursors:

```javascript
const { cursors } =  useCursors((cursorUpdate) => {
  console.log(cursorUpdate);
}, { returnCursors: true });
```

---

### Error Handling

`useSpace`, `useMembers`, `useLocks` and `useCursors` return connection and channel errors you may encounter, so that you can handle then within your components. This may include when a client doesn't have permission to attach to a channel, or if it loses its connection to Ably.

```jsx
const { connectionError, channelError } = useMembers();

if (connectionError) {
  // TODO: handle connection errors
} else if (channelError) {
  // TODO: handle channel errors
} else {
  return <SpacesPoweredComponent />
}
```
