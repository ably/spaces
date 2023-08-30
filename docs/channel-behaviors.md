# Channel usage

## Introduction & Context

The below channels are used by the Spaces library internally.

### Space channel

Each `Space` (as defined by the [`Space` class](/docs/class-definitions.md#space)) creates its own [Ably Channel](https://ably.com/docs/channels).

The channel name is defined by the `name` of the Space and takes the form: `_ably_space_${name}`. The full name of a `channel` belonging to a `Space` called 'my_space' would therefore be `_ably_space_my_space`.

### Cursors

If any member of a `Space` subscribes to or sets cursor updates a channel is created for `cursors` updates.

The channel name is defined by the channel name of the Space with the `_cursors` suffix, taking the form: `${space.getChannelName()}_cursors`. The full name of a channel belonging to a `Space` called 'my_space' would therefore be `_ably_space_my_space_cursors`.

#### Events published

1. `cursorUpdate` - a batch of cursor updates passed to [`set`](/docs/class-definitions.md#set).
