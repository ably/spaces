## Class Definitions

**Contents**

- [Spaces](#spaces)
- [SpaceOptions](#spaceoptions)
- [Space](#space)
- [SpaceMember](#spacemember)

### Spaces

#### constructor(ably)

Create a new instance of the Spaces library.
This requires a promise instance of the Ably library to be passed in.
Refer to the [Ably-JS Documentation](https://github.com/ably/ably-js#introduction) for information on setting up a realtime promise client.

| Property | Type                 |
|----------|----------------------|
| ably     | Ably.RealtimePromise |


#### get(name, options?)
Get or create a Space instance. Options may only be provided if a Space instance with the supplied name does not yet exist.

| Property | Type                                           |
|----------|------------------------------------------------|
| name     | string                                         |
| options  | [SpaceOptions](#spaceoptions) &#124; undefined |

### SpaceOptions

Used to configure a Space instance on creation.

#### offlineTimeout
Number of milliseconds after a user loses connection or closes their browser window to wait before their [SpaceMember](#spacemember) object is removed from the members list.

Default is 120,000ms (2 minutes).

### Space
An instance of a Space created using [spaces.get](#getname-options).

#### enter(profileData?)
Enter this space with optional profile data and notify other clients in the space via the [membersUpdate](#membersupdate) event.
This data can be an arbitrary JSON-serializable object which will be attached to the member object and delivered to other members of the space.

| Property    | Type   |
|-------------|--------|
| profileData | Object |


#### leave()

Leave the space. This removes the member from the space and notifies other space members.

#### on(event, callback)
Used for subscribing to realtime events within the space. Currently, only one event is supported:

##### membersUpdate
Fires when a member enters or leaves the space. The argument supplied to the event listener callback is the current array of all [SpaceMember](#spacemember) objects within the space.


### SpaceMember

A SpaceMember represents a member within a Space instance.
This could be the local client or other remote clients which are connected to the same space.

| Property    | Type                              |
|-------------|-----------------------------------|
| clientId    | string                            |
| isConnected | bool                              |
| profileData | Object                            |
| lastEvent   | {name: string, timestamp: number} |
