// An example of members locating at and locking elements in a slides
// application.
import Ably from 'ably';
import Spaces from '../dist/cjs/Spaces.js';
import { Lock, LockAttributes } from '../dist/cjs/index.js';

// SlideElement represents an element on a slide which a member can both be
// located at and attempt to lock (e.g. an editable text box).
class SlideElement {
  slideId: string;
  elementId: string;

  constructor(slideId: string, elementId: string) {
    this.slideId = slideId;
    this.elementId = elementId;
  }

  // the identifier to use to lock this SlideElement.
  lockId(): string {
    return `/slides/${this.slideId}/element/${this.elementId}`;
  }

  // the attributes to use when locking this SlideElement.
  lockAttributes(): LockAttributes {
    const attributes = new LockAttributes();
    attributes.set('slideId', this.slideId);
    attributes.set('elementId', this.elementId);
    return attributes;
  }
}

// define a main async function since we can't use await at the top-level.
const main = async () => {
  info('initialising Ably client');
  const client = new Ably.Realtime({
    key: process.env.ABLY_API_KEY,
    clientId: 'Alice',
  });

  info('entering the "example" space');
  const spaces = new Spaces(client);
  const space = await spaces.get('example');
  await space.enter();

  const location = new SlideElement('123', '456');
  info(`setting location to ${JSON.stringify(location)}`);
  await space.locations.set(location);

  info('checking if location is locked');
  const lockId = location.lockId();
  const isLocked = space.locks.get(lockId) !== undefined;
  if (isLocked) {
    info('location is already locked');
    process.exit();
  } else {
    info('location is not locked');
  }

  // initialise a Promise which resolves when the lock changes status.
  const lockEvent = new Promise<Lock>((resolve) => {
    const listener = (lock: Lock) => {
      if (lock.request.id === lockId) {
        info(`received lock update for "${lockId}", status=${lock.request.status}`);
        resolve(lock);
        info('unsubscribing from lock events');
        space.locks.unsubscribe(listener);
      }
    };
    info('subscribing to lock events');
    space.locks.subscribe('update', listener);
  });

  info(`attempting to lock "${lockId}"`);
  const req = await space.locks.acquire(lockId, { attributes: location.lockAttributes() });
  info(`lock status is "${req.status}"`);

  info('waiting for lock event');
  const lock = await lockEvent;

  info(`lock status is "${lock.request.status}"`);

  info('releasing the lock');
  await space.locks.release(lockId);

  info('done');
  client.close();
};

const info = (msg: string) => {
  console.log(new Date(), 'INFO', msg);
}

main();
