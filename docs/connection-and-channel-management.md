# Connection and channel management

Spaces SDK uses the Ably Core SDK client [connections](https://ably.com/docs/connect) and [channels](https://ably.com/docs/channels) to provide higher level features like cursors or locations. Both connections and channels will transition through multiple states throughout their lifecycle. Most state transitions (like a short loss in connectivity) will be handled by the Ably SDK, but there will be use cases where developers will need to observe these states and handle them accordingly.

This document describes how to access a connection and channels on Spaces, and where to find information about how to handle their state changes.

## Connection

When initializing the Spaces SDK, an Ably client is passed as a required argument:

```ts
const client = new Realtime.Promise({ key: "<API-key>", clientId: "<client-ID>" });
const spaces = new Spaces(client);
```

The Spaces instance exposes the underlying connection which is an event emitter. It can be used to listen for changes in connection state. The client and connection are both available on the Spaces instance:

```ts
spaces.client.connection.on('disconnected', () => {})
spaces.connection.on('disconnected', () => {})
```

### Read more on:

- [Connections](https://ably.com/docs/connect)
- [Connection state and recovery](https://ably.com/docs/connect/states)

## Channels

When a Space is instantiated, it creates an underlying [Ably Channel](https://ably.com/docs/channels) which is used to deliver the functionality of each space. The Ably Channel object is available in the `.channel` attribute.

Similar to a connection, a channel is an event emitter, allowing us to listen for state changes:

```ts
const mySpace = spaces.get('mySpace');
mySpace.channel.once('suspended', () => {});
```

When using the Cursors API, an additional channel is used, but it will only be created if we attach a subscriber or set a cursor position:

```ts
mySpace.cursors.channel.once('attached', () => {});

// but .channel will only be defined if one of these was called before
mySpace.cursors.set({ position: { x, y } });   
mySpace.cursors.subscribe('update', () => {});
```

### Read more on:

- [Channels](https://ably.com/docs/channels)
- [Channel states](https://ably.com/docs/channels#states)
- [Handle channel failure](https://ably.com/docs/channels#failure)