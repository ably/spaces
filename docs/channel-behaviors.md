# Channel Behaviors

**Contents**

- [Channel Behaviors](#channel-behaviors)
  - [Introduction \& Context](#introduction--context)
  - [Channels](#channels)
    - [Space](#space)
      - [Events Fired](#events-fired)
    - [Cursors](#cursors)
      - [Events Fired](#events-fired-1)

## Introduction & Context

These channels are used by the Spaces library and features of the Spaces library including Live Cursors.

It is not recommended that you rely on these channels directly, without the Spaces library, so this documentation is provided with the expectation that the channels are used for the purposes of monitoring, debugging, or learning more about how the Space API works.

## Channels

### Space

Each `Space` (as defined by the [`Space` class](/docs/class-definitions.md#space)) has its own `channel` assigned to it.

The `channel` name is defined by the `name` of the `Space` and takes the form: `_ably_space_${name}`.

The full name of a `channel` belonging to a `Space` called 'my_space' would therefore be `_ably_space_my_space`.

#### Events Fired

1. `membersUpdate` - an update to any number of members of the Space
2. `locationUpdate` - an update specifically to the `Location` of any number of members of the Space

### Cursors

Any `Space` may also make use of the Spaces library's `Cursors` feature.

The `Cursors` `channel` name is defined by the `channelName` of the Space with the `_cursors` suffix, taking the form `${space.getChannelName()}_cursors`.

The full name of a `channel` belonging to a set of `Cursors` belonging to a `Space` called 'my_space' would therefore be `_ably_space_my_space_cursors`.

#### Events Fired

1. `cursorUpdate` - an update to any number of cursors associated with any number of members of the Space
