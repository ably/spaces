import { describe, it } from 'vitest';
import { nanoid } from 'nanoid';
import { CursorUpdate, SpaceMember } from '../../src/types.js';
import { setTimeout } from 'node:timers/promises';
import { createClients, getSpaceInstances } from './utilities/setup.js';
import { LocationsEventMap } from '../../src/Locations.js';
import { SpaceEventMap } from '../../src/Space.js';
import { MembersEventMap } from '../../src/Members.js';
import { CursorsEventMap } from '../../src/Cursors.js';

describe.concurrent(
  'integration tests',
  () => {
    it('space members', async (context) => {
      // Given a Spaces client `performerSpaces` and a Spaces client `observerSpaces`, both configured to use the same API key, and each configured to use a different randomly-generated client ID...
      const {
        performer: { spaces: performerSpaces, clientId: performerClientId },
        observer: { spaces: observerSpaces },
      } = await createClients();

      // ...and Space instances `performerSpace` and `observerSpace`, fetched from `performerSpaces` and `observerSpaces` respectively using `#get` with a randomly-generated space name, and passing an `offlineTimeout` option of 5 seconds when creating `observerSpace`...
      //
      // (Motivation for choosing 5 seconds for `offlineTimeout`: in scenario_1_4 we wait to observe the members `remove` event, which requires us to wait a duration of `offlineTimeout`, and hence means that execution of this test case will take at least `offlineTimeout`. We choose 5 seconds as an arbitrary value which is small enough such that we’re happy for the test to take this long to execute, but not so short as to run the risk of missing this `remove` event whilst waiting for scenario_1_3’s `leave()` to return.)
      const { performerSpace, observerSpace } = await getSpaceInstances({
        performerSpaces,
        observerSpaces,
        observerSpaceOptions: { offlineTimeout: 5000 },
      });

      // (scenario_1_1: entering a space)

      // Note: I think that there are situations in which the promisesForEventsTriggeredByEntering.membersEnter promise might not resolve, for the same reasons as described in commit 6e77941 — that is, the call to `performerSpace.enter()` might result in `observerSpace` seeing a presence UPDATE instead of an ENTER and hence not emitting a members `enter` event. I haven’t observed this happening in practice yet, and I’d like to be able to test that the SDK emits a members `enter` event, so I’m going to keep the test as it is for now. If we can think of a way for this test to be sure that a members `enter` event will be emitted, then we should implement it.

      // (Start of setup for assertions_1_1)
      const promisesForEventsTriggeredByEntering = {
        // ...then, when we add a listener to `observerSpace` for the `update` event using `#once`...
        spaceUpdate: new Promise<SpaceEventMap['update']>((resolve) => {
          observerSpace.once('update', resolve);
        }),
        // ...and add a listener to `observerSpace.members` for the `enter` event using `#once`...
        membersEnter: new Promise<MembersEventMap['enter']>((resolve) => {
          observerSpace.members.once('enter', resolve);
        }),
      };
      // (End of setup for assertions_1_1)

      // ...and then call `enter()` on `performerSpace`...
      await performerSpace.enter();

      // (Start of assertions_1_1)
      // ...we observe that the two aforementioned listeners get called...
      const [spaceUpdateEventFromEntering, membersEnterEvent] = await Promise.all([
        promisesForEventsTriggeredByEntering.spaceUpdate,
        promisesForEventsTriggeredByEntering.membersEnter,
      ]);

      // ...and that the space `update` event’s list of members has length 1 (presumably the member who just entered)...
      context.expect(spaceUpdateEventFromEntering.members).toHaveLength(1);

      // ...and that the following is true for each of the space `update` event’s member and the members `enter` event:
      for (const member of [spaceUpdateEventFromEntering.members[0], membersEnterEvent]) {
        // ...its `clientId` matches that of `performerClient`...
        context.expect(member.clientId).toEqual(performerClientId);
        // ...and its `profileData` is null (expected since we didn’t pass any profile data to `performerSpace.enter()`)...
        context.expect(member.profileData).to.be.null;
        // ...and its `isConnected` is true.
        context.expect(member.isConnected).to.be.true;
      }
      // (End of assertions_1_1)

      // (scenario_1_2: updating profile data)

      // (Start of setup for assertions_1_2)
      const promisesForEventsTriggeredByUpdatingProfileData = {
        // Next, when we add a listener to `observerSpace` for the `update` event using `#once`...
        spaceUpdate: new Promise<SpaceEventMap['update']>((resolve) => {
          observerSpace.once('update', resolve);
        }),
        // ...and add a listener to `observerSpace.members` for the `updateProfile` event using `#once`...
        membersUpdateProfile: new Promise<MembersEventMap['updateProfile']>((resolve) => {
          observerSpace.members.once('updateProfile', resolve);
        }),
      };
      // (End of setup for assertions_1_2)

      // ...and then call `updateProfileData` on `performerSpace` with some arbitrarily-chosen profile data...
      await performerSpace.updateProfileData({ name: 'Luna Gomes' });

      // (Start of assertions_1_2)
      // ...we observe that the two aforementioned listeners get called...
      const [spaceUpdateEventFromUpdatingProfileData, membersUpdateProfileEvent] = await Promise.all([
        promisesForEventsTriggeredByUpdatingProfileData.spaceUpdate,
        promisesForEventsTriggeredByUpdatingProfileData.membersUpdateProfile,
      ]);

      // ...and that the space `update` event’s list of members continues to have length 1...
      context.expect(spaceUpdateEventFromUpdatingProfileData.members).toHaveLength(1);

      // ...and that the following is true for each of the space `update` event’s member and the members `updateProfile` event:
      for (const member of [spaceUpdateEventFromUpdatingProfileData.members[0], membersUpdateProfileEvent]) {
        // ...its `clientId` matches that of `performerClient`...
        context.expect(member.clientId).toEqual(performerClientId);
        // ...and its `profileData` matches that passed to `performerSpace.updateProfileData()`...
        context.expect(member.profileData).toEqual({ name: 'Luna Gomes' });
        // ...and its `isConnected` is true.
        context.expect(member.isConnected).to.be.true;
      }
      // (End of assertions_1_2)

      // (scenario_1_3: leaving space)

      // (Start of setup for assertions_1_3)
      const promisesForEventsTriggeredByLeaving = {
        // Next, when we add a listener to `observerSpace` for the `update` event using `#once`...
        spaceUpdate: new Promise<SpaceEventMap['update']>((resolve) => {
          observerSpace.once('update', resolve);
        }),
        // ...and add a listener to `observerSpace.members` for the `leave` event using `#once`...
        membersLeave: new Promise<MembersEventMap['leave']>((resolve) => {
          observerSpace.members.once('leave', resolve);
        }),
      };
      // (End of setup for assertions_1_3)

      // ...and then call `leave` on `performerSpace` with some arbitrarily-chosen profile data (which is different to that passed to `updateProfileData`)...
      await performerSpace.leave({ name: 'Huey Brahma', age: 30 });

      // (Start of assertions_1_3)
      // ...we observe that the two aforementioned listeners get called...
      const [spaceUpdateEventFromLeaving, membersLeaveEvent] = await Promise.all([
        promisesForEventsTriggeredByLeaving.spaceUpdate,
        promisesForEventsTriggeredByLeaving.membersLeave,
      ]);

      // ...and that the space `update` event’s list of members continues to have length 1...
      context.expect(spaceUpdateEventFromLeaving.members).toHaveLength(1);

      // ...and that the following is true for each of the space `update` event’s member and the members `leave` event:
      for (const member of [spaceUpdateEventFromLeaving.members[0], membersLeaveEvent]) {
        // ...its `clientId` matches that of `performerClient`...
        context.expect(member.clientId).toEqual(performerClientId);
        // ...and its `profileData` matches that passed to `performerSpace.leave()`...
        context.expect(member.profileData).toEqual({ name: 'Huey Brahma', age: 30 });
        // ...and its `isConnected` is true.
        context.expect(member.isConnected).to.be.false;
      }
      // (End of assertions_1_3)

      // (scenario_1_4: SDK removes member)

      // (Start of setup for assertions_1_4)
      const promisesForEventsTriggeredByRemoval = {
        // Next, when we add a listener to `observerSpace` for the `update` event using `#once`...
        spaceUpdate: new Promise<SpaceEventMap['update']>((resolve) => {
          observerSpace.once('update', resolve);
        }),
        // ...and add a listener to `observerSpace.members` for the `remove` event using `#once`...
        membersRemove: new Promise<MembersEventMap['remove']>((resolve) => {
          observerSpace.members.once('remove', resolve);
        }),
      };
      // (End of setup for assertions_1_4)

      // (Start of assertions_1_4)
      // ...we observe that (eventually) the two aforementioned listeners get called...
      const [spaceUpdateEventFromRemoval, membersRemoveEvent] = await Promise.all([
        promisesForEventsTriggeredByRemoval.spaceUpdate,
        promisesForEventsTriggeredByRemoval.membersRemove,
      ]);

      // ...and that the space `update` event’s list of members is now empty...
      context.expect(spaceUpdateEventFromRemoval.members).to.be.empty;

      // ...and that the members `leave` event has `clientId` matching that of `performerClient`...
      context.expect(membersRemoveEvent.clientId).toEqual(performerClientId);
      // ...and its `profileData` continues to match that passed to `performerSpace.leave()`...
      context.expect(membersRemoveEvent.profileData).toEqual({ name: 'Huey Brahma', age: 30 });
      // ...and its `isConnected` is false.
      context.expect(membersRemoveEvent.isConnected).to.be.false;
      // (End of assertions_1_4)
    });

    it('cursors', async (context) => {
      // Given a Spaces client `performerSpaces` and a Spaces client `observerSpaces`, both configured to use the same API key, and each configured to use a different randomly-generated client ID...
      const {
        performer: { spaces: performerSpaces, clientId: performerClientId },
        observer: { spaces: observerSpaces },
      } = await createClients();

      // ...and Space instances `performerSpace` and `observerSpace`, fetched from `performerSpaces` and `observerSpaces` respectively using `#get` with a randomly-generated space name...
      //const outboundBatchInterval = 50;
      const { performerSpace, observerSpace } = await getSpaceInstances({
        performerSpaces,
        observerSpaces,
      });

      // ...and then call `performerSpace.enter()` and wait for it to complete (this is needed in order to be able to set cursor position)...
      await performerSpace.enter();

      // (scenario_2_1: a workaround to get `cursors.set()` working)

      // TODO decide what to do about this:
      //
      // `performerSpace.cursors.set()` will drop all requests until:
      //
      // - it has received a presence update on the cursors channel, and,
      // - at the moment of receiving this presence update, `presence.get()` on the cursors channel indicates that more than one member is present
      //
      // But, it does not subscribe for presence updates on the cursors channel until one of the following happens:
      //
      // 1. its `set()` method is called
      // 2. one of its `get*()` methods is called
      // 3. its `subscribe` or `unsubscribe` method is called
      //
      // This seems to mean that a client that sends cursor updates but does not listen for them will drop the first update passed to `cursors.set()`.
      //
      // So, to work around this, here I perform a "sacrificial" call to `performerSpace.cursors.set()`, the idea of which is to put `performerSpace.cursors.set()` into a state in which it will not drop the updates passed in subsequent calls.
      await performerSpace.cursors.set({ position: { x: 0, y: 0 } });

      // (scenario_2_2: set cursor position)

      // (Start of setup for assertions_2_2)
      const cursorUpdatesPromise = new Promise<CursorsEventMap['update'][]>((resolve) => {
        const observedCursorEventsData: CursorsEventMap['update'][] = [];
        // TODO Decide what to do about this, should we expose the completion of the attach operation via the cursors.subscribe() API, the same way as ably-js exposes it through `presence.subscribe()`?
        //
        // Note that the `cursors.subscribe()` API does not currently provide any way for the user to know that the channel attach operation triggered by calling `presence.subscribe()` has completed. So, we have no guarantee that the `observerSpace.cursors.subscribe()` listener will receive the cursor positions sent by the calls to `performerSpace.cursors.set()` below. (However, the 1 second wait below makes it likely.)

        const cursorsListener = (data: CursorsEventMap['update']) => {
          observedCursorEventsData.push(data);
          if (observedCursorEventsData.length === 4) {
            observerSpace.cursors.unsubscribe(cursorsListener);
            resolve(observedCursorEventsData);
          }
        };

        // ...then, when we add a listener to `observerSpace.cursors` for the `update` event using `#subscribe`...
        observerSpace.cursors.subscribe('update', cursorsListener);
      });
      // (End of setup for assertions_2_2)

      // ...and then wait 1 second (the idea being that this is hopefully long enough for `performerSpace.cursors` to find out about the presence enter operation triggered by calling `observerSpace.cursors.subscribe()`...
      await setTimeout(1000);

      // ...and then call `set()` on `performerSpace.cursors` 4 times, passing a different arbitrarily-chosen value each time...
      const cursorsToSet = [
        { position: { x: 0, y: 15 }, data: { state: 'move' } },
        { position: { x: 30, y: 20 }, data: { state: 'move' } },
        { position: { x: 40, y: 30 }, data: { state: 'move' } },
        { position: { x: 50, y: 0 }, data: { state: 'leave' } },
      ];

      for (const cursorToSet of cursorsToSet) {
        await performerSpace.cursors.set(cursorToSet);
      }

      // (Start of assertions_2_2)

      // ...we observe that the aforementioned listener gets called 4 times, and receives the same cursor data as we passed to `performerSpace.cursors.set()`, in the same order.
      const observedCursorEventsData = await cursorUpdatesPromise;
      for (const [index, setCursor] of cursorsToSet.entries()) {
        context.expect(observedCursorEventsData[index]).toMatchObject({ clientId: performerClientId, ...setCursor });
      }
      // (End of assertions_2_2)
    });

    it('member location', async (context) => {
      // Given a Spaces client `performerSpaces` and a Spaces client `observerSpaces`, both configured to use the same API key, and each configured to use a different randomly-generated client ID...
      const {
        performer: { spaces: performerSpaces, clientId: performerClientId },
        observer: { spaces: observerSpaces },
      } = await createClients();

      // ...and Space instances `performerSpace` and `observerSpace`, fetched from `performerSpaces` and `observerSpaces` respectively using `#get` with a randomly-generated space name, and passing an `offlineTimeout` option of 5 seconds when creating `observerSpace`...
      //
      // (Motivation for choosing 5 seconds for `offlineTimeout`: TODO)
      const { performerSpace, observerSpace } = await getSpaceInstances({
        performerSpaces,
        observerSpaces,
        observerSpaceOptions: { offlineTimeout: 5000 },
      });

      // ...and we enter `performerSpace` and wait for `observerSpace` to receive the `update` event that this triggers...
      // TODO why
      // ah I think we want to be sure that we first of all see the enter, so that the update is what we expect? — ok, that's what enterUpdateEventAssertionsPromise is for
      const promisesForEventsTriggeredByEntering = {
        spaceUpdate: new Promise<SpaceEventMap['update']>((resolve) => {
          observerSpace.once('update', resolve);
        }),
      };

      await performerSpace.enter();
      const spaceUpdateEventFromEntering = await promisesForEventsTriggeredByEntering.spaceUpdate;
      context.expect(spaceUpdateEventFromEntering.members).toHaveLength(1);
      context.expect(spaceUpdateEventFromEntering.members[0].clientId).toEqual(performerClientId);

      // (scenario_3_1: set a location)

      const promisesForEventsTriggeredBySettingSlide1 = {
        spaceUpdate: new Promise<SpaceEventMap['update']>((resolve) => {
          observerSpace.once('update', resolve);
        }),
        locationsUpdate: new Promise<LocationsEventMap['update']>((resolve) => {
          observerSpace.locations.once('update', resolve);
        }),
      };

      await performerSpace.locations.set({ slide: 1 });

      // TODO update everywhere to do things this way
      const eventsTriggeredBySettingSlide1 = {
        spaceUpdate: await promisesForEventsTriggeredBySettingSlide1.spaceUpdate,
        membersUpdate: await promisesForEventsTriggeredBySettingSlide1.locationsUpdate,
      };

      context.expect(eventsTriggeredBySettingSlide1.spaceUpdate.members).toHaveLength(1);
      context.expect(eventsTriggeredBySettingSlide1.spaceUpdate.members[0].clientId).toEqual(performerClientId);
      context.expect(eventsTriggeredBySettingSlide1.spaceUpdate.members[0].location).toEqual({ slide: 1 });

      context.expect(eventsTriggeredBySettingSlide1.membersUpdate.member.clientId).toEqual(performerClientId);
      context.expect(eventsTriggeredBySettingSlide1.membersUpdate.previousLocation).toBeNull();
      context.expect(eventsTriggeredBySettingSlide1.membersUpdate.currentLocation).toEqual({ slide: 1 });

      // (scenario_3_2: set another location)

      const promisesForEventsTriggeredBySettingSlide2 = {
        spaceUpdate: new Promise<SpaceEventMap['update']>((resolve) => {
          observerSpace.once('update', resolve);
        }),
        locationsUpdate: new Promise<LocationsEventMap['update']>((resolve) => {
          observerSpace.locations.once('update', resolve);
        }),
      };

      await performerSpace.locations.set({ slide: 2 });

      const eventsTriggeredBySettingSlide2 = {
        spaceUpdate: await promisesForEventsTriggeredBySettingSlide2.spaceUpdate,
        membersUpdate: await promisesForEventsTriggeredBySettingSlide2.locationsUpdate,
      };

      context.expect(eventsTriggeredBySettingSlide2.spaceUpdate.members).toHaveLength(1);
      context.expect(eventsTriggeredBySettingSlide2.spaceUpdate.members[0].clientId).toEqual(performerClientId);
      context.expect(eventsTriggeredBySettingSlide2.spaceUpdate.members[0].location).toEqual({ slide: 2 });

      // TODO presumably this could be complicated if it hasn’t received the { slide: 1 } presence update yet? then presumably previousLocation would be null. take a look
      context.expect(eventsTriggeredBySettingSlide2.membersUpdate.member.clientId).toEqual(performerClientId);
      context.expect(eventsTriggeredBySettingSlide2.membersUpdate.previousLocation).toEqual({ slide: 1 });
      context.expect(eventsTriggeredBySettingSlide2.membersUpdate.currentLocation).toEqual({ slide: 2 });

      // (scenario_3_3: leaving space)

      const promisesForEventsTriggeredByLeaving = {
        spaceUpdate: new Promise<SpaceEventMap['update']>((resolve) => {
          observerSpace.once('update', resolve);
        }),
      };

      // TODO remove — to see if this fixes the erroneous { slide: 1 } in the below TODO by giving performerSpace’s presence set a chance to catch up. with this wait, it passed 20 times in a row
      await setTimeout(1000);

      await performerSpace.leave();

      const eventsTriggeredByLeaving = {
        spaceUpdate: await promisesForEventsTriggeredByLeaving.spaceUpdate,
      };

      context.expect(eventsTriggeredByLeaving.spaceUpdate.members).toHaveLength(1);
      context.expect(eventsTriggeredByLeaving.spaceUpdate.members[0].clientId).toEqual(performerClientId);
      // TODO sometimes this is { slide: 1 }, why?
      context.expect(eventsTriggeredByLeaving.spaceUpdate.members[0].location).toEqual({ slide: 2 });

      // (scenario_3_4: SDK removes member)

      const promisesForEventsTriggeredByRemoval = {
        spaceUpdate: new Promise<SpaceEventMap['update']>((resolve) => {
          observerSpace.once('update', resolve);
        }),
        membersUpdate: new Promise<LocationsEventMap['update']>((resolve) => {
          observerSpace.locations.once('update', resolve);
        }),
      };

      const eventsTriggeredByRemoval = {
        spaceUpdate: await promisesForEventsTriggeredByRemoval.spaceUpdate,
        membersUpdate: await promisesForEventsTriggeredByRemoval.membersUpdate,
      };

      context.expect(eventsTriggeredByRemoval.spaceUpdate.members).to.be.empty;

      context.expect(eventsTriggeredByRemoval.membersUpdate.member.clientId).toEqual(performerClientId);
      context.expect(eventsTriggeredByRemoval.membersUpdate.previousLocation).toEqual({ slide: 2 });
      context.expect(eventsTriggeredByRemoval.membersUpdate.currentLocation).toBeNull();
    });

    // TODO locks?
  },
  { timeout: 60_000 },
);
