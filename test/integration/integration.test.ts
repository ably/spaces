import { beforeAll, describe, expect, it } from 'vitest';
import { createClients } from './utilities/setup.js';
import { LocationsEventMap } from '../../src/Locations.js';
import Space, { SpaceEventMap } from '../../src/Space.js';
import { MembersEventMap } from '../../src/Members.js';
import { CursorsEventMap } from '../../src/Cursors.js';
import { nanoid } from 'nanoid';
import { LocksEventMap } from '../../src/Locks.js';
import Spaces from '../../src/Spaces.js';

/*
 * These tests have one `describe` for each area of functionality, each of these `describe`s then containing multiple `it`s.
 *
 * Each `it` within a given `describe` is considered to be a single step within a test, and relies on the side effects of the previous `it`s within that `describe`.
 */
describe(
  'integration tests',
  () => {
    describe('space members', () => {
      let performerSpaces;
      let observerSpaces;
      let performerClientId;
      let performerSpace;
      let observerSpace;

      beforeAll(async () => {
        [{ spaces: performerSpaces, clientId: performerClientId }, { spaces: observerSpaces }] = await createClients({
          count: 2,
        });

        const spaceName = nanoid();
        performerSpace = await performerSpaces.get(spaceName);
        // Motivation for choosing 5 seconds for `offlineTimeout`: in scenario 1.4 we wait to observe the members `remove` event, which requires us to wait a duration of `offlineTimeout`, and hence means that execution of this test case will take at least `offlineTimeout`. We choose 5 seconds as an arbitrary value which is small enough such that we’re happy for the test to take this long to execute, but not so short as to run the risk of missing this `remove` event whilst waiting for scenario_1_3’s `leave()` to return.
        observerSpace = await observerSpaces.get(spaceName, { offlineTimeout: 5000 });
      });

      it('scenario 1.1: entering a space', async () => {
        const promisesForEventsTriggeredByEntering = {
          spaceUpdate: new Promise<SpaceEventMap['update']>((resolve) => {
            observerSpace.once('update', resolve);
          }),
          // Note: I think that there are situations in which this listener might not get called, for the same reasons as described in commit 6e77941 — that is, the call to `performerSpace.enter()` might result in `observerSpace` seeing a presence UPDATE instead of an ENTER and hence not emitting a members `enter` event. I haven’t observed this happening in practice yet, and I’d like to be able to test that the SDK emits a members `enter` event, so I’m going to keep the test as it is for now. If we can think of a way for this test to be sure that a members `enter` event will be emitted, then we should implement it.
          membersEnter: new Promise<MembersEventMap['enter']>((resolve) => {
            observerSpace.members.once('enter', resolve);
          }),
        };

        await performerSpace.enter();

        const eventsTriggeredByEntering = {
          spaceUpdate: await promisesForEventsTriggeredByEntering.spaceUpdate,
          membersEnter: await promisesForEventsTriggeredByEntering.membersEnter,
        };

        expect(eventsTriggeredByEntering.spaceUpdate.members).toHaveLength(1);

        for (const member of [
          eventsTriggeredByEntering.spaceUpdate.members[0],
          eventsTriggeredByEntering.membersEnter,
        ]) {
          expect(member.clientId).toEqual(performerClientId);
          expect(member.profileData).to.be.null;
          expect(member.isConnected).to.be.true;
        }
      });

      it('scenario 1.2: updating profile data', async () => {
        const promisesForEventsTriggeredByUpdatingProfileData = {
          spaceUpdate: new Promise<SpaceEventMap['update']>((resolve) => {
            observerSpace.once('update', resolve);
          }),
          membersUpdateProfile: new Promise<MembersEventMap['updateProfile']>((resolve) => {
            observerSpace.members.once('updateProfile', resolve);
          }),
        };

        await performerSpace.updateProfileData({ name: 'Luna Gomes' });

        const eventsTriggeredByUpdatingProfileData = {
          spaceUpdate: await promisesForEventsTriggeredByUpdatingProfileData.spaceUpdate,
          membersUpdateProfile: await promisesForEventsTriggeredByUpdatingProfileData.membersUpdateProfile,
        };

        expect(eventsTriggeredByUpdatingProfileData.spaceUpdate.members).toHaveLength(1);

        for (const member of [
          eventsTriggeredByUpdatingProfileData.spaceUpdate.members[0],
          eventsTriggeredByUpdatingProfileData.membersUpdateProfile,
        ]) {
          expect(member.clientId).toEqual(performerClientId);
          // i.e. matches that passed to `performerSpace.updateProfileData()`
          expect(member.profileData).toEqual({ name: 'Luna Gomes' });
          expect(member.isConnected).to.be.true;
        }
      });

      it('scenario 1.3: leaving space', async () => {
        const promisesForEventsTriggeredByLeaving = {
          spaceUpdate: new Promise<SpaceEventMap['update']>((resolve) => {
            observerSpace.once('update', resolve);
          }),
          membersLeave: new Promise<MembersEventMap['leave']>((resolve) => {
            observerSpace.members.once('leave', resolve);
          }),
        };

        // this profile data is different to that which we passed to `updateProfileData` in scenario 1.2
        await performerSpace.leave({ name: 'Huey Brahma', age: 30 });

        const eventsTriggeredByLeaving = {
          spaceUpdate: await promisesForEventsTriggeredByLeaving.spaceUpdate,
          membersLeave: await promisesForEventsTriggeredByLeaving.membersLeave,
        };

        expect(eventsTriggeredByLeaving.spaceUpdate.members).toHaveLength(1);

        for (const member of [eventsTriggeredByLeaving.spaceUpdate.members[0], eventsTriggeredByLeaving.membersLeave]) {
          expect(member.clientId).toEqual(performerClientId);
          // i.e. matches that passed to `performerSpace.leave()`
          expect(member.profileData).toEqual({ name: 'Huey Brahma', age: 30 });
          expect(member.isConnected).to.be.false;
        }
      });

      it('scenario 1.4: SDK removes member', async () => {
        const promisesForEventsTriggeredByRemoval = {
          spaceUpdate: new Promise<SpaceEventMap['update']>((resolve) => {
            observerSpace.once('update', resolve);
          }),
          membersRemove: new Promise<MembersEventMap['remove']>((resolve) => {
            observerSpace.members.once('remove', resolve);
          }),
        };

        const eventsTriggeredByRemoval = {
          spaceUpdate: await promisesForEventsTriggeredByRemoval.spaceUpdate,
          membersRemove: await promisesForEventsTriggeredByRemoval.membersRemove,
        };

        expect(eventsTriggeredByRemoval.spaceUpdate.members).to.be.empty;

        expect(eventsTriggeredByRemoval.membersRemove.clientId).toEqual(performerClientId);
        // i.e. continues to match that passed to `performerSpace.leave()`
        expect(eventsTriggeredByRemoval.membersRemove.profileData).toEqual({ name: 'Huey Brahma', age: 30 });
        expect(eventsTriggeredByRemoval.membersRemove.isConnected).to.be.false;
      });
    });

    describe('cursors', () => {
      let performerSpaces: Spaces;
      let observerSpaces: Spaces;
      let performerClientId: string;
      let performerSpace: Space;
      let observerSpace: Space;

      beforeAll(async () => {
        [{ spaces: performerSpaces, clientId: performerClientId }, { spaces: observerSpaces }] = await createClients({
          count: 2,
        });

        const spaceName = nanoid();
        performerSpace = await performerSpaces.get(spaceName);
        observerSpace = await observerSpaces.get(spaceName);

        // needed in order to set cursor position
        await performerSpace.enter();
      });

      it('scenario 2.1: a workaround to get `cursors.set()` working', async () => {
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
      });

      it('scenario 2.2: set cursor position', async () => {
        // Before calling `performerSpace.cursors.set()` below, we want to be sure that `performerSpace.cursors` has found out about the presence enter operations triggered by calling `performerSpace.cursors.set()` in scenario 2.1, and by calling `observerSpace.cursors.subscribe()` below, so that it doesn’t drop the cursor updates that we pass to `set()`. So here we set up a promise which will resolve once `performerSpace.cursors.channel` sees two clients (i.e. `performerSpaces` and `observerSpaces`) as present.
        const performerCursorsChannelObserverPresentPromise = new Promise<void>((resolve) => {
          const presence = performerSpace.cursors.channel!.presence;
          const listener = async () => {
            const members = await presence.get();
            if (members.length === 2) {
              presence.unsubscribe(listener);
              resolve();
            }
          };
          presence.subscribe(listener);
        });

        // There’s a lot going on in this scenario (two other promises that are there to guarantee predictable behaviour in the test), so it’s worth pointing out that `cursorUpdatesPromise` is the core of the assertions in this test scenario.
        const cursorUpdatesPromise = new Promise<CursorsEventMap['update'][]>((resolve) => {
          const observedCursorEventsData: CursorsEventMap['update'][] = [];
          const cursorsListener = (data: CursorsEventMap['update']) => {
            observedCursorEventsData.push(data);
            if (observedCursorEventsData.length === 4) {
              observerSpace.cursors.unsubscribe(cursorsListener);
              resolve(observedCursorEventsData);
            }
          };

          observerSpace.cursors.subscribe('update', cursorsListener);
        });

        // To be sure that the `observerSpace.cursors.subscribe()` listener will receive the cursor positions sent by the calls to `performerSpace.cursors.set()` below, we need to know that the cursors channel attach operation triggered by calling `observerSpace.cursors.subscribe()` has completed. The `cursors.subscribe()` API does not currently provide any direct way for the user to know that this attach operation has completed, so here we do so by directly observing the channel.
        //
        // We should consider exposing the completion of the attach operation via the `cursors.subscribe()` API, the same way as ably-js exposes it through `presence.subscribe()`. I’m not convinced of the necessity though — not sure how useful it’d be for an average user, and we can work around it in tests (as I have here).
        const observerCursorsChannelAttachedPromise = observerSpace.cursors.channel!.whenState('attached');

        await Promise.all([performerCursorsChannelObserverPresentPromise, observerCursorsChannelAttachedPromise]);

        const cursorsToSet = [
          { position: { x: 0, y: 15 }, data: { state: 'move' } },
          { position: { x: 30, y: 20 }, data: { state: 'move' } },
          { position: { x: 40, y: 30 }, data: { state: 'move' } },
          { position: { x: 50, y: 0 }, data: { state: 'leave' } },
        ];

        for (const cursorToSet of cursorsToSet) {
          await performerSpace.cursors.set(cursorToSet);
        }

        // Note that we check that the order in which we recieve the cursor updates matches that in which they were passed to `set()`
        const observedCursorEventsData = await cursorUpdatesPromise;
        for (const [index, setCursor] of cursorsToSet.entries()) {
          expect(observedCursorEventsData[index]).toMatchObject({ clientId: performerClientId, ...setCursor });
        }
      });
    });

    describe('member location', () => {
      let performerSpaces;
      let observerSpaces;
      let performerClientId;
      let performerSpace;
      let observerSpace;

      beforeAll(async () => {
        [{ spaces: performerSpaces, clientId: performerClientId }, { spaces: observerSpaces }] = await createClients({
          count: 2,
        });

        const spaceName = nanoid();
        performerSpace = await performerSpaces.get(spaceName);
        // Motivation for choosing 5 seconds for `offlineTimeout`: same as in scenario 1.4; that is, in scenario_3_4 we want to wait to observe a members `remove` event, but don’t want test to take too long to execute.
        observerSpace = await observerSpaces.get(spaceName, { offlineTimeout: 5000 });

        // We enter `performerSpace` and wait for `observerSpace` to receive the `update` event that this triggers (we do this so that we can be sure we aren’t instead going to see this event in scenario 3.1).
        const promisesForEventsTriggeredByEntering = {
          spaceUpdate: new Promise<SpaceEventMap['update']>((resolve) => {
            observerSpace.once('update', resolve);
          }),
        };

        await performerSpace.enter();

        const eventsTriggeredByEntering = {
          spaceUpdate: await promisesForEventsTriggeredByEntering.spaceUpdate,
        };
        expect(eventsTriggeredByEntering.spaceUpdate.members).toHaveLength(1);
        expect(eventsTriggeredByEntering.spaceUpdate.members[0].clientId).toEqual(performerClientId);
      });

      let promisesForEventsTriggeredBySettingSlide1;

      it('scenario 3.1: set a location', async () => {
        promisesForEventsTriggeredBySettingSlide1 = {
          observerSpace: {
            spaceUpdate: new Promise<SpaceEventMap['update']>((resolve) => {
              observerSpace.once('update', resolve);
            }),
            locationsUpdate: new Promise<LocationsEventMap['update']>((resolve) => {
              observerSpace.locations.once('update', resolve);
            }),
          },
          // This listener is not part of scenario 3.1; it’s used at the start of scenario_3_2.
          performerSpace: {
            locationsUpdate: new Promise<LocationsEventMap['update']>((resolve) => {
              performerSpace.locations.once('update', resolve);
            }),
          },
        };

        await performerSpace.locations.set({ slide: 1 });

        const eventsTriggeredBySettingSlide1 = {
          spaceUpdate: await promisesForEventsTriggeredBySettingSlide1.observerSpace.spaceUpdate,
          locationsUpdate: await promisesForEventsTriggeredBySettingSlide1.observerSpace.locationsUpdate,
        };

        expect(eventsTriggeredBySettingSlide1.spaceUpdate.members).toHaveLength(1);
        expect(eventsTriggeredBySettingSlide1.spaceUpdate.members[0].clientId).toEqual(performerClientId);
        // i.e. matches that passed to `performerSpace.locations.set()`
        expect(eventsTriggeredBySettingSlide1.spaceUpdate.members[0].location).toEqual({ slide: 1 });

        expect(eventsTriggeredBySettingSlide1.locationsUpdate.member.clientId).toEqual(performerClientId);
        expect(eventsTriggeredBySettingSlide1.locationsUpdate.previousLocation).toBeNull();
        // i.e. matches that passed to `performerSpace.locations.set()`
        expect(eventsTriggeredBySettingSlide1.locationsUpdate.currentLocation).toEqual({ slide: 1 });
      });

      let promisesForEventsTriggeredBySettingSlide2;

      it('scenario 3.2: set another location', async () => {
        // (Start of setting up state for this scenario)
        await (async () => {
          // Wait for `performerSpace` to become aware of the location update that it just triggered via `locations.set()`. This ensures that `previousLocation` will be as we expect in this scenario’s assertions.
          const event = await promisesForEventsTriggeredBySettingSlide1.performerSpace.locationsUpdate;
          expect(event.currentLocation).toEqual({ slide: 1 });
        })();
        // (End of setting up state for this scenario)

        promisesForEventsTriggeredBySettingSlide2 = {
          observerSpace: {
            spaceUpdate: new Promise<SpaceEventMap['update']>((resolve) => {
              observerSpace.once('update', resolve);
            }),
            locationsUpdate: new Promise<LocationsEventMap['update']>((resolve) => {
              observerSpace.locations.once('update', resolve);
            }),
          },
          // This listener is not part of scenario 3.2; it’s used at the start of scenario_3_3.
          performerSpace: {
            locationsUpdate: new Promise<LocationsEventMap['update']>((resolve) => {
              performerSpace.locations.once('update', resolve);
            }),
          },
        };

        // different data to that in scenario 3.1
        await performerSpace.locations.set({ slide: 2 });

        const eventsTriggeredBySettingSlide2 = {
          spaceUpdate: await promisesForEventsTriggeredBySettingSlide2.observerSpace.spaceUpdate,
          locationsUpdate: await promisesForEventsTriggeredBySettingSlide2.observerSpace.locationsUpdate,
        };

        expect(eventsTriggeredBySettingSlide2.spaceUpdate.members).toHaveLength(1);
        expect(eventsTriggeredBySettingSlide2.spaceUpdate.members[0].clientId).toEqual(performerClientId);
        // i.e. matches that passed by this scenario’s call to `locations.set()`
        expect(eventsTriggeredBySettingSlide2.spaceUpdate.members[0].location).toEqual({ slide: 2 });

        expect(eventsTriggeredBySettingSlide2.locationsUpdate.member.clientId).toEqual(performerClientId);
        // i.e. matches that passed by scenario 3.2’s call to `locations.set()`
        expect(eventsTriggeredBySettingSlide2.locationsUpdate.previousLocation).toEqual({ slide: 1 });
        // i.e. matches that passed by this scenario’s call to `locations.set()`
        expect(eventsTriggeredBySettingSlide2.locationsUpdate.currentLocation).toEqual({ slide: 2 });
      });

      it('scenario 3.3: leaving space', async () => {
        // (Start of setting up state for this scenario)
        await (async () => {
          // Wait for `performerSpace` to become aware of the location update that it just triggered via `locations.set()`. This ensures that `location` will be as we expect in this scenario’s assertions.
          const event = await promisesForEventsTriggeredBySettingSlide2.performerSpace.locationsUpdate;
          expect(event.currentLocation).toEqual({ slide: 2 });
        })();
        // (End of setting up state for this scenario)

        const promisesForEventsTriggeredByLeaving = {
          spaceUpdate: new Promise<SpaceEventMap['update']>((resolve) => {
            observerSpace.once('update', resolve);
          }),
        };

        await performerSpace.leave();

        const eventsTriggeredByLeaving = {
          spaceUpdate: await promisesForEventsTriggeredByLeaving.spaceUpdate,
        };

        expect(eventsTriggeredByLeaving.spaceUpdate.members).toHaveLength(1);
        expect(eventsTriggeredByLeaving.spaceUpdate.members[0].clientId).toEqual(performerClientId);
        // i.e. matches that passed to `performerSpace.locations.set()` in scenario 3.2
        expect(eventsTriggeredByLeaving.spaceUpdate.members[0].location).toEqual({ slide: 2 });
      });

      it('scenario 3.4: SDK removes member', async () => {
        const promisesForEventsTriggeredByRemoval = {
          spaceUpdate: new Promise<SpaceEventMap['update']>((resolve) => {
            observerSpace.once('update', resolve);
          }),
          locationsUpdate: new Promise<LocationsEventMap['update']>((resolve) => {
            observerSpace.locations.once('update', resolve);
          }),
        };

        const eventsTriggeredByRemoval = {
          spaceUpdate: await promisesForEventsTriggeredByRemoval.spaceUpdate,
          locationsUpdate: await promisesForEventsTriggeredByRemoval.locationsUpdate,
        };

        expect(eventsTriggeredByRemoval.spaceUpdate.members).to.be.empty;

        expect(eventsTriggeredByRemoval.locationsUpdate.member.clientId).toEqual(performerClientId);
        // i.e. that which was the `currentLocation` in scenario 3.3
        expect(eventsTriggeredByRemoval.locationsUpdate.previousLocation).toEqual({ slide: 2 });
        expect(eventsTriggeredByRemoval.locationsUpdate.currentLocation).toBeNull();
      });
    });

    describe('locking', () => {
      let spaces1;
      let clientId1;
      let spaces2;
      let clientId2;
      let space1;
      let space2;

      beforeAll(async () => {
        [{ spaces: spaces1, clientId: clientId1 }, { spaces: spaces2, clientId: clientId2 }] = await createClients({
          count: 2,
        });

        const spaceName = nanoid();
        space1 = await spaces1.get(spaceName);
        space2 = await spaces2.get(spaceName);

        // need to enter in order to acquire locks
        await space1.enter();
        await space2.enter();
      });

      let lockId;

      it('scenario 4.1: query an unlocked lock', async () => {
        lockId = nanoid();

        const getLockReturnValues = await Promise.all([space1.locks.get(lockId), space2.locks.get(lockId)]);

        for (const returnValue of getLockReturnValues) {
          expect(returnValue).toBeUndefined();
        }
      });

      it('scenario 4.2: acquire a lock', async () => {
        const promisesForEventsTriggeredByAcquiringLock = {
          space1: {
            locksUpdate: new Promise<LocksEventMap['update']>((resolve) => {
              space1.locks.once('update', resolve);
            }),
          },
          space2: {
            locksUpdate: new Promise<LocksEventMap['update']>((resolve) => {
              space2.locks.once('update', resolve);
            }),
          },
        };

        const lock = await space1.locks.acquire(lockId);

        expect(lock.status).toEqual('pending');

        const eventsTriggeredByAcquiringLock = {
          space1: {
            locksUpdate: await promisesForEventsTriggeredByAcquiringLock.space1.locksUpdate,
          },
          space2: {
            locksUpdate: await promisesForEventsTriggeredByAcquiringLock.space2.locksUpdate,
          },
        };

        for (const event of [
          eventsTriggeredByAcquiringLock.space1.locksUpdate,
          eventsTriggeredByAcquiringLock.space2.locksUpdate,
        ]) {
          expect(event.id).toEqual(lockId);
          expect(event.member.clientId).toEqual(clientId1);
          expect(event.reason).toBeUndefined();
          expect(event.status).toEqual('locked');
        }
      });

      it('scenario 4.3: query a locked lock', async () => {
        const getLockReturnValues = await Promise.all([space1.locks.get(lockId), space2.locks.get(lockId)]);

        for (const lock of getLockReturnValues) {
          expect(lock.id).toEqual(lockId);
          expect(lock.member.clientId).toEqual(clientId1);
          expect(lock.reason).toBeUndefined();
          expect(lock.status).toEqual('locked');
        }
      });

      it('scenario 4.4: try to acquire a lock that’s already held', async () => {
        const promisesForEventsTriggeredByAcquiringHeldLock = {
          space1: {
            locksUpdate: new Promise<LocksEventMap['update']>((resolve) => {
              space1.locks.once('update', resolve);
            }),
          },
          space2: {
            locksUpdate: new Promise<LocksEventMap['update']>((resolve) => {
              space2.locks.once('update', resolve);
            }),
          },
        };

        const space2Lock = await space2.locks.acquire(lockId);

        expect(space2Lock.status).toEqual('pending');

        const eventsTriggeredByAcquiringHeldLock = {
          space1: {
            locksUpdate: await promisesForEventsTriggeredByAcquiringHeldLock.space1.locksUpdate,
          },
          space2: {
            locksUpdate: await promisesForEventsTriggeredByAcquiringHeldLock.space2.locksUpdate,
          },
        };

        // Note that the emitted events make it appear as though space1 has lost the lock but space2 also failed to acquire it, which is not what I would have expected to happen. https://ably.atlassian.net/browse/COL-549 aims to fix this.

        for (const event of [
          eventsTriggeredByAcquiringHeldLock.space1.locksUpdate,
          eventsTriggeredByAcquiringHeldLock.space2.locksUpdate,
        ]) {
          expect(event.id).toEqual(lockId);
          expect(event.member.clientId).toEqual(clientId2);
          expect(event.status).toEqual('unlocked');
          expect(event.reason?.statusCode).toEqual(400);
          expect(event.reason?.code).toEqual(101003);
        }
      });

      it('scenario 4.5: lock holder leaves space', async () => {
        const promisesForEventsTriggeredByLockHolderLeaving = {
          space1: {
            locksUpdate: new Promise<LocksEventMap['update']>((resolve) => {
              space1.locks.once('update', resolve);
            }),
          },
          space2: {
            locksUpdate: new Promise<LocksEventMap['update']>((resolve) => {
              space2.locks.once('update', resolve);
            }),
          },
        };

        await space1.leave();

        const eventsTriggeredByLockHolderLeaving = {
          space1: {
            locksUpdate: await promisesForEventsTriggeredByLockHolderLeaving.space1.locksUpdate,
          },
          space2: {
            locksUpdate: await promisesForEventsTriggeredByLockHolderLeaving.space2.locksUpdate,
          },
        };

        for (const event of [
          eventsTriggeredByLockHolderLeaving.space1.locksUpdate,
          eventsTriggeredByLockHolderLeaving.space2.locksUpdate,
        ]) {
          expect(event.status).toEqual('unlocked');
          expect(event.reason).toBeUndefined();
        }
      });

      it('scenario 4.6: other client tries to acquire a lock that’s no longer held', async () => {
        const promisesForEventsTriggeredByOtherClientAcquiringLock = {
          space1: {
            locksUpdate: new Promise<LocksEventMap['update']>((resolve) => {
              space1.locks.once('update', resolve);
            }),
          },
          space2: {
            locksUpdate: new Promise<LocksEventMap['update']>((resolve) => {
              space2.locks.once('update', resolve);
            }),
          },
        };

        const lock2 = await space2.locks.acquire(lockId);

        expect(lock2.status).toEqual('pending');

        const eventsTriggeredByOtherClientAcquiringLock = {
          space1: {
            locksUpdate: await promisesForEventsTriggeredByOtherClientAcquiringLock.space1.locksUpdate,
          },
          space2: {
            locksUpdate: await promisesForEventsTriggeredByOtherClientAcquiringLock.space2.locksUpdate,
          },
        };

        for (const event of [
          eventsTriggeredByOtherClientAcquiringLock.space1.locksUpdate,
          eventsTriggeredByOtherClientAcquiringLock.space2.locksUpdate,
        ]) {
          expect(event.id).toEqual(lockId);
          expect(event.member.clientId).toEqual(clientId2);
          expect(event.reason).toBeUndefined();
          expect(event.status).toEqual('locked');
        }
      });
    });
  },
  { timeout: 60_000 },
);
