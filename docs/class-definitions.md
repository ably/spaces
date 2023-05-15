## Class Definitions

**Contents**

- [Spaces](#spaces)
- [SpaceOptions](#spaceoptions)
- [Space](#space)
- [SpaceMember](#spacemember)
- [Locations](#locations-1)
- [Cursors](#cursors-1)
- [Cursor](#cursor)
- [CursorPosition](#cursorposition)

### Spaces

#### constructor(ably)

Create a new instance of the Spaces library.
This requires a promise instance of the Ably library to be passed in.
Refer to the [Ably-JS Documentation](https://github.com/ably/ably-js#introduction) for information on setting up a realtime promise client.

| Property | Type                 |
| -------- | -------------------- |
| ably     | Ably.RealtimePromise |

#### get(name, options?)

Get or create a Space instance. Options may only be provided if a Space instance with the supplied name does not yet exist.

| Property | Type                                           |
| -------- | ---------------------------------------------- |
| name     | string                                         |
| options  | [SpaceOptions](#spaceoptions) &#124; undefined |

### SpaceOptions

Used to configure a Space instance on creation.

#### offlineTimeout

Number of milliseconds after a user loses connection or closes their browser window to wait before their [SpaceMember](#spacemember) object is removed from the members list.

Default is 120,000ms (2 minutes).

#### cursors

Configure the cursors API.

##### outboundBatchInterval

The interval at which a batch of cursors position is published. This is multiplied by the number of members in the space reduced by 1. (i.e. outboundBatchInterval \* (membersCount - 1)).

Default 100ms.

##### inboundBatchInterval

The interval at which the listener for cursor positions is updated with a single position.

Default is 1ms.

##### paginationLimit

The number of [history API](https://ably.com/docs/realtime/history) pages searched for the last published cursor position.

Default is 5.

### Space

An instance of a Space created using [spaces.get](#getname-options).

#### enter(profileData?)

Enter this space with optional profile data and notify other clients in the space via the [membersUpdate](#membersupdate) event.
This data can be an arbitrary JSON-serializable object which will be attached to the member object and delivered to other members of the space.

| Property    | Type   |
| ----------- | ------ |
| profileData | Object |

#### leave()

Leave the space. This removes the member from the space and notifies other space members.

#### on(event, callback)

Used for subscribing to realtime events within the space.

##### membersUpdate

Fires when a member enters or leaves the space. The argument supplied to the event listener callback is the current array of all [SpaceMember](#spacemember) objects within the space.

##### enter

Fires when a member enters the space. The argument supplied to the event listener callback is the [SpaceMember](#spacemember) which entered the space.

##### leave

Fires when a member leaves the space. The argument supplied to the event listener callback is the [SpaceMember](#spacemember) which left the space.
Note that the leave event will only fire once the [offlineTimeout](#offlinetimeout) has passed.

#### getMembers()

Returns an array of all [SpaceMember](#spacemember) objects currently in the space, including any members who have left and not yet timed out. (_see: [SpaceOptions.offlineTimeout](#offlinetimeout)_)

#### getSelf()

Gets the [SpaceMember](#spacemember) object which relates to the local client.

#### locations

Get the [Locations](#locations-1) object for this space.

#### cursors

Get the [Cursors](#cursors-1) object for this space.

### SpaceMember

A SpaceMember represents a member within a Space instance.
This could be the local client or other remote clients which are connected to the same space.

| Property    | Type                              |
| ----------- | --------------------------------- |
| clientId    | string                            |
| isConnected | bool                              |
| profileData | Object                            |
| location    | Any                               |
| lastEvent   | {name: string, timestamp: number} |

### Locations

Handles the tracking of member locations within a space.

#### set(location)

Set your current location. Location can be any JSON-serializable object. Fires a [locationUpdate](#locationupdate) event for all connected clients in this space.

| Property | Type |
| -------- | ---- |
| location | Any  |

#### on(event, callback)

Used for subscribing to location specific updates. Currently, only one event is supported:

##### locationUpdate

Fires when a member updates their location. The argument supplied to the event listener is an object with the following fields:

| Property         | Type                        |
| ---------------- | --------------------------- |
| member           | [SpaceMember](#spacemember) |
| currentLocation  | Any                         |
| previousLocation | Any                         |

#### off(event, callback)

Used for unsubscribing from location-specific updates.

With no arguments, unsubscribes from all location updates.

With a callback as the first argument, unsubscribes from all location updates which use the same callback as a listener.

With an event or list of events as the first argument, unsubscribes from all location updates matching that(those) event(s).

With an event or list of events as the first argument AND a callback as the second argument, unsubscribes from all location updates matching that(those) event(s) which also use the same callback as a listener.

#### createTracker(locationTrackerPredicate)

Used to create a tracker for a specific location using a predicate for the [locationUpdate](#locationUpdate) change event. Returns a [LocationTracker][#LocationTracker].

##### locationUpdatePredicate(locationUpdate)

A predicate function called with an locationUpdate event. Return a boolean for events that should be emitted via the tracker.

### LocationTracker

Handles the tracking of a specific location within a space.

#### on(callback)

Used for subscribing to a listener once the locations class has emitted a `locationUpdate` event, filtered by the [locationUpdatePredicate](#locationupdatepredicatelocationupdate).

#### off(callback)

Used for unsubscribing from a listener.

#### members()

Used to retrieve a list of members in the Space for whom the [locationUpdatePredicate](#locationupdatepredicatelocationupdate) would return `true` based on their current location.

### Cursors

#### get(name)

Get a [Cursor](#cursor) with a specific name. Names are unique per space.

| Property | Type   |
| -------- | ------ |
| name     | string |

#### getAll(name)

Get the last position of all cursors in this space, for each connection. Pass a cursor name to only get the last position of that cursor for each connection.

| Property | Type   |
| -------- | ------ |
| name     | string |

#### on(event, callback)

Used for subscribing to all cursor updates. Currently, only one event is supported:

##### positionsUpdate

Fires when a cursors position is updated. The argument supplied is an object of one or more cursors by name and their respective cursor movements since the last update.

| Property  | Type                                                |
| --------- | --------------------------------------------------- |
| positions | Record<string, [CursorPosition](#cursorposition)[]> |

### Cursor

An individual cursor.

#### setPosition(position)

Set the position of this cursor. The position will be updated for each other member of the space via a Cursors [positionsUpdate](#positionsupdate) or Cursor [positionUpdate](#positionupdate).

| Property | Type                              |
| -------- | --------------------------------- |
| position | [CursorPosition](#cursorposition) |

#### on(event, callback)

Used for subscribing to a specific cursors updates. Currently, only one event is supported:

##### positionUpdate

Fires when this cursors location is updated. Contains an array of cursor positions since the last update.

| Property  | Type                                |
| --------- | ----------------------------------- |
| positions | [CursorPosition](#cursorposition)[] |

### CursorPosition

Represents the position of a cursor.

| Property | Type   |
| -------- | ------ |
| x        | number |
| y        | number |
