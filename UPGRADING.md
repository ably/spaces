# Upgrade Guide

This guide provides detailed instructions on how to upgrade between versions of the Spaces SDK that contain breaking changes.

## 0.5.x to 0.6.0

### Spaces Now Depends On Ably Pub/Sub v3

**Expected Impact: High**

The Spaces SDK no longer uses the `ably` package. It now builds on Ably Pub/Sub v3, and you create the Pub/Sub client that you pass to the Spaces SDK with one of:

- `@ably/pubsub-device`, for code that runs on an end user's device, such as a browser or a mobile app.
- `@ably/pubsub-server`, for backend services.

Replace `ably` with one of these packages and create your client with its factory function instead of `new Ably.Realtime()`.

**Before**

```sh
npm install ably @ably/spaces
```

```ts
import { Realtime } from 'ably';
import Spaces from '@ably/spaces';

const client = new Realtime({ key: '<API-key>', clientId: '<client-ID>' });
const spaces = new Spaces(client);
```

**After**

```sh
npm install @ably/pubsub-device @ably/spaces
```

```ts
import { createClient } from '@ably/pubsub-device';
import { createSpacesClient } from '@ably/spaces';

const client = createClient({ key: '<API-key>', clientId: '<client-ID>' });
const spaces = createSpacesClient(client);
```

On a server, install `@ably/pubsub-server` instead and create the client with its `createRealtimeClient` function.

When using the CDN bundles, load the Pub/Sub v3 bundle, `https://cdn.ably.com/lib/ably.min-3.js`, in place of `ably.min-2.js`. It defines an `AblyPubSub` global in place of `Ably`, so create the client with `AblyPubSub.createClient()` instead of `new Ably.Realtime()`.

In React, `AblyProvider` from `ably/react` is replaced by `PubSubClientProvider` from `@ably/pubsub-device/react`, which takes the client the same way: `<PubSubClientProvider client={client}>`.

### Spaces Is Now Created With `createSpacesClient`

**Expected Impact: High**

The package no longer has a default export, and the `Spaces` class can no longer be constructed with `new`. Use the `createSpacesClient` factory function instead; it takes the same arguments and returns a `SpacesClient`, which has the same `client`, `connection`, `version` and `get()` members as the `Spaces` instance it replaces.

**Before**

```ts
import Spaces from '@ably/spaces';

const spaces = new Spaces(client);
```

**After**

```ts
import { createSpacesClient } from '@ably/spaces';

const spaces = createSpacesClient(client);
```

When using the CDN bundle, the `Spaces` global is replaced by an `AblySpaces` namespace: call `AblySpaces.createSpacesClient(client)` instead of `new Spaces(client)`.

### `SpacesProvider` Is Renamed To `SpacesClientProvider`

**Expected Impact: High**

The React provider that makes the Spaces client available to hooks is renamed from `SpacesProvider` to `SpacesClientProvider`. It takes the same props.

**Before**

```jsx
import { SpacesProvider, SpaceProvider } from '@ably/spaces/react';

<SpacesProvider client={spaces}>
  <SpaceProvider name="my-space">
    <App />
  </SpaceProvider>
</SpacesProvider>;
```

**After**

```jsx
import { SpacesClientProvider, SpaceProvider } from '@ably/spaces/react';

<SpacesClientProvider client={spaces}>
  <SpaceProvider name="my-space">
    <App />
  </SpaceProvider>
</SpacesClientProvider>;
```
