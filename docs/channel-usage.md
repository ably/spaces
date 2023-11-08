# Channel usage

## Introduction & Context

The below channels are used by the Spaces library internally.

### Space channel

Each `Space` (as defined by the [`Space` class](https://sdk.ably.com/builds/ably/spaces/main/typedoc/classes/Space.html)) creates its own [Ably Channel](https://ably.com/docs/channels).

The channel name is defined by the `name` of the Space and takes the form: `${name}::$space`. The full name of a `channel` belonging to a `Space` called 'slides' would therefore be `slides::$space`.

### Cursors

If any member of a `Space` subscribes to or sets cursor updates a channel is created for `cursors` updates.

The channel name is defined by the name of the Space with the `::$cursors` suffix, taking the form: `${space.name}::$cursors`. The full name of a channel belonging to a `Space` called 'slides' would therefore be `slides::$cursors`.

#### Events published

1. `cursorUpdate` - a batch of cursor updates passed to [`set`](https://sdk.ably.com/builds/ably/spaces/main/typedoc/classes/Cursors.html#set).
