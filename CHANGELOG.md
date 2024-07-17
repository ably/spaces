# CHANGELOG

## v0.4.0

Breaking changes in this release:

* Upgrade to using Ably JavaScript SDK v2 [\#325](https://github.com/ably/spaces/pull/325)

With this release the Spaces SDK now requires Ably JavaScript SDK v2 to be installed and used with the Spaces client. Please refer to [Ably JavaScript SDK v2](https://github.com/ably/ably-js/releases/tag/2.0.0) GitHub release notes for the list of breaking changes and the corresponding migration guide.

**Full Changelog**: https://github.com/ably/spaces/compare/0.3.1...0.4.0

## v0.3.1

No breaking changes were introduced in this release.

* Fix not being able to import CJS Spaces bundle due to `ERR_REQUIRE_ESM` error [\#307](https://github.com/ably/spaces/pull/307)

## v0.3.0

Breaking changes in this release:

* [COL-577] Use ::$space as space channel suffix [\#244](https://github.com/ably/spaces/pull/244)

This change updates the name of the channel [used by spaces internally](./docs/channel-usage.md).

Previously, if you create a space with `spaces.get('example')`, this would create an Ably channel named `example-space`. This will now become `example::$space`.

When deploying this change, it's important to note that there will be no continuty between the channel used so far and the channel used after the update. If you have customer applications that are running spaces, sessions using the old channel should end before this update is implemented.

Other notable changes:

* [COL-533] Upgrade Ably to 1.2.46 by @lawrence-forooghian in https://github.com/ably/spaces/pull/235
* [COL-56] Add integration tests by @lawrence-forooghian in https://github.com/ably/spaces/pull/229

**Full Changelog**: https://github.com/ably/spaces/compare/0.2.0...0.3.0

## v0.2.0

In this release, we introduce React hooks for Spaces [\#233](https://github.com/ably/spaces/pull/233). See the [React Hooks documentation](/docs/react.md) for further details.

Breaking changes in this release:

* \[MMB-317\], \[MMB-318\] — Remove the `LockAttributes` type [\#214](https://github.com/ably/spaces/pull/214) ([lawrence-forooghian](https://github.com/lawrence-forooghian))
* Remove ability to pass array of event names to `EventEmitter.prototype.once` [\#196](https://github.com/ably/spaces/pull/196) ([lawrence-forooghian](https://github.com/lawrence-forooghian))

Other notable changes:

* \[COL-335\] Fix bug where `space.enter()` sometimes hangs. [\#227](https://github.com/ably/spaces/pull/227) ([lawrence-forooghian](https://github.com/lawrence-forooghian))
* Add agent param [\#220](https://github.com/ably/spaces/pull/220) ([dpiatek](https://github.com/dpiatek))
* Add script to test CDN bundle [\#216](https://github.com/ably/spaces/pull/216) ([lawrence-forooghian](https://github.com/lawrence-forooghian))
* Publish to new CDN bucket only [\#205](https://github.com/ably/spaces/pull/205) ([surminus](https://github.com/surminus))
* \[MMB-156\] Add documentation comments and generate HTML documentation [\#204](https://github.com/ably/spaces/pull/204) ([lawrence-forooghian](https://github.com/lawrence-forooghian))
* Demo updates [\#195](https://github.com/ably/spaces/pull/195) ([dpiatek](https://github.com/dpiatek))

**Full Changelog**: https://github.com/ably/spaces/compare/0.1.3...0.2.0

## v0.1.3

Breaking changes in this release:
* `space.locks.getLocksForConnectionId` is now private by @lawrence-forooghian https://github.com/ably/spaces/pull/188

Other notable changes:
* Refactor space updates by @dpiatek in https://github.com/ably/spaces/pull/180
  * Fixes `space.updateProfileData` not passing the existing `ProfileData` if a function was passed in as an argument
  * Fixes `space.leave` resetting `ProfileData` when no arguments are passed in

**Full Changelog**: https://github.com/ably/spaces/compare/0.1.2...0.1.3

## v0.1.2

No breaking changes were introduced in this release.

* cursors: Fix cursor batching calculation by @lmars in https://github.com/ably/spaces/pull/169
* [MMB-260] Update default batch time to 25ms by @dpiatek in https://github.com/ably/spaces/pull/167

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
