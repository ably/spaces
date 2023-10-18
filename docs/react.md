# React Hooks

Incorporate Spaces into your React application using idiomatic and user-friendly React Hooks!

Using this module you can:

- Interact with [Ably Spaces](https://ably.com/docs/spaces) using a React Hook.
- Subscribe to Spaces events
- Retrieve Spaces members
- Set member location
- Acquire component lock
- Set cursor position

### Compatible React Versions

The hooks are compatible with all versions of React above 16.8.0

## Usage

Start by connecting your app to Ably using the `SpacesProvider` component.

The `SpacesProvider` should be high in your component tree, wrapping every component which needs to access Spaces.

```jsx
import { Realtime } from "ably";
import Spaces from "@ably/spaces";
import { SpacesProvider, SpaceProvider } from "@ably/spaces/react";

const ably = new Realtime.Promise({ key: "your-ably-api-key", clientId: 'me' });
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

The `useSpace` hook lets you subscribe to the current Space and receive Space state events and get current Space instance.

```javascript
const { space } = useSpace((update) => {
  console.log(update);
});
```

### useMembers

The `useMembers` hook useful in building avatar stacks. Using `useMembers` hook you can retrieve spaces members.
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

it also lets you update current member location by using `update` method provided by hook:

```javascript
const { usdate } = useLocation((locationUpdate) => {
  console.log(locationUpdate);
});
```

### useLocks

The `useLocks` hook lets you subscribe to lock events by registering a listener.
Lock events are emitted whenever the lock state transitions into `locked` or `unlocked`.

```javascript
useLocks((lockUpdate) => {
  console.log(lockUpdate);
});
```

### useLock

The `useLock` returns the status of a lock and, if it has been acquired, the member holding the lock

```javascript
const { status, member } = useLock('my-lock');
```

### useCursors

The `useCursors` allows you to track a member's pointer position updates across an application:

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

When using the Spaces react hooks, your Ably client may encounter a variety of errors, for example if it doesn't have permissions to attach to a channel it may encounter a channel error, or if it loses connection from the Ably network it may encounter a connection error.

To allow you to handle these errors, the `useSpace`, `useMembers`, `useLocks`, `useCursors` hooks return connection and channel errors so that you can react to them in your components:

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
