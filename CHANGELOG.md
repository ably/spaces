# CHANGELOG

## v0.1.1

No breaking changes were introduced in this release.

* Update README.md by @Srushtika in https://github.com/ably/spaces/pull/159
* Update README.md by @Srushtika in https://github.com/ably/spaces/pull/160
* refactor: avoid early initialisation of common errors by @owenpearson in https://github.com/ably/spaces/pull/163
* Update demo to use latest version of Spaces by @dpiatek in https://github.com/ably/spaces/pull/161
* fix: unlock update hasn't triggered after lock release by @ttypic in https://github.com/ably/spaces/pull/164
* [MMB-247] Channel tagging by @dpiatek in https://github.com/ably/spaces/pull/166

## v0.1.0

In this release, we're advancing Spaces from alpha to beta. Along with introducing this library to a wider audience, we've decided to move it to the `ably` organisation as Spaces is no longer an experiment, it's something we see as an excellent supplement to our core SDKs to help developers build collaborative environments in their apps. We are committed to grow and officially maintain it. 

If you are one of our early adopters, this means you need to update your `package.json` from `@ably-labs/spaces` to `@ably/spaces`.

Visit [official documentation on Ably's website](https://ably.com/docs/spaces) to learn more about Spaces and understand what the beta status means for you.

The following APIs are currently available:
- **Space** - a virtual area of your application in which realtime collaboration between users can take place.
- **Avatar stack** - the most common way of showing the online status of users in an application.
- **Member locations** - track where users are to see which part of your application they're interacting with.
- **Live cursors** - track the cursor positions of users in realtime.
- **Component locking** - optimistically lock stateful UI components before editing them.

Your feedback will help prioritize improvements and fixes in subsequent releases. Spaces features have been validated for a set of use-cases, but breaking changes may still occur between minor releases until we reach 1.0.0. The beta is implemented based on real world situations and loads, but we'd advise to take caution when adding it to production environments.

Please reach out to [beta@ably.com](mailto:beta@ably.com) for any questions or share feedback through [this form]( https://go.ably.com/spaces-feedback).
