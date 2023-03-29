import { it, describe, expect, beforeEach, afterEach, vi } from 'vitest';
import EventEmitter, { removeListener } from './EventEmitter';

describe('removeListener', () => {
  const listener = () => true;
  const altListener = () => false;

  const targetListenerArrayFixture1 = [altListener, listener, altListener];
  const targetListenerArrayFixture2 = [listener, altListener, listener];

  it('successfully removes a listener from arrays', () => {
    const targetListeners = [[...targetListenerArrayFixture1], [...targetListenerArrayFixture2]];
    removeListener(targetListeners, listener);
    expect(targetListeners).toStrictEqual([[altListener, altListener], [altListener]]);
  });
  it('successfully removes a listener from objects', () => {
    const targetListeners = [
      {
        fixture1: [...targetListenerArrayFixture1],
        fixture2: [...targetListenerArrayFixture2],
      },
    ];
    removeListener(targetListeners, listener);
    expect(targetListeners).toStrictEqual([
      {
        fixture1: [altListener, altListener],
        fixture2: [altListener],
      },
    ]);
  });

  it('successfully handles a mixture of objects and arrays', () => {
    const targetListeners = [
      {
        fixture1: [...targetListenerArrayFixture1],
        fixture2: [...targetListenerArrayFixture2],
      },
      [...targetListenerArrayFixture1],
      [...targetListenerArrayFixture2],
    ];
    removeListener(targetListeners, listener);
    expect(targetListeners).toStrictEqual([
      {
        fixture1: [altListener, altListener],
        fixture2: [altListener],
      },
      [altListener, altListener],
      [altListener],
    ]);
  });

  it('only removes listeners from a filtered list of events', () => {
    const targetListeners = [
      {
        fixture1: [...targetListenerArrayFixture1],
        fixture2: [...targetListenerArrayFixture2],
      },
    ];
    removeListener(targetListeners, listener, 'fixture2');
    expect(targetListeners).toStrictEqual([
      {
        fixture1: [altListener, listener, altListener],
        fixture2: [altListener],
      },
    ]);
    removeListener(targetListeners, altListener, 'fixture1');
    expect(targetListeners).toStrictEqual([
      {
        fixture1: [listener],
        fixture2: [altListener],
      },
    ]);
  });
});

declare module 'vitest' {
  export interface TestContext {
    eventEmitter: EventEmitter<{ myEvent: string; myOtherEvent: string; myThirdEvent: string }>;
  }
}

describe('EventEmitter', () => {
  const listener = () => true;
  const altListener = () => false;

  afterEach(async (context) => {
    context.eventEmitter = new EventEmitter();
  });

  describe('calling the on method', () => {
    beforeEach(async (context) => {
      context.eventEmitter = new EventEmitter();
    });
    it('adds a listener to the "any" set of event listeners', (context) => {
      context.eventEmitter.on(listener);
      expect(context.eventEmitter.any).toStrictEqual([listener]);
    });
    it('adds a listener to a provided field of an event listener', (context) => {
      context.eventEmitter.on('myEvent', listener);
      expect(context.eventEmitter.events['myEvent']).toStrictEqual([listener]);
    });
    it('adds a listener to all provided fields of an event listener', (context) => {
      context.eventEmitter.on(['myEvent', 'myOtherEvent', 'myThirdEvent'], listener);
      expect(context.eventEmitter.events['myEvent']).toStrictEqual([listener]);
      expect(context.eventEmitter.events['myOtherEvent']).toStrictEqual([listener]);
      expect(context.eventEmitter.events['myThirdEvent']).toStrictEqual([listener]);
    });
  });

  describe('calling the off method', () => {
    beforeEach(async (context) => {
      const eventEmitter: EventEmitter<{ myEvent: string; myOtherEvent: string; myThirdEvent: string }> =
        new EventEmitter();
      eventEmitter.on(listener);
      eventEmitter.on(altListener);
      eventEmitter.on('myEvent', listener);
      eventEmitter.on(['myEvent', 'myOtherEvent', 'myThirdEvent'], listener);
      eventEmitter.on('myEvent', altListener);
      eventEmitter.on(['myEvent', 'myOtherEvent', 'myThirdEvent'], altListener);
      eventEmitter.once(listener);
      eventEmitter.once(altListener);
      eventEmitter.once('myEvent', listener);
      eventEmitter.once(['myEvent', 'myOtherEvent', 'myThirdEvent'], listener);
      eventEmitter.once('myEvent', altListener);
      eventEmitter.once(['myEvent', 'myOtherEvent', 'myThirdEvent'], altListener);
      context.eventEmitter = eventEmitter;
    });

    it('Removes all listeners from all lists', (context) => {
      context.eventEmitter.off();
      expect(context.eventEmitter.any).toStrictEqual([]);
      expect(context.eventEmitter.anyOnce).toStrictEqual([]);
      expect(context.eventEmitter.events).toStrictEqual(Object.create(null));
      expect(context.eventEmitter.eventsOnce).toStrictEqual(Object.create(null));
    });

    it('removes one listener from all lists', (context) => {
      context.eventEmitter.off(listener);
      expect(context.eventEmitter.any).toStrictEqual([altListener]);
      expect(context.eventEmitter.anyOnce).toStrictEqual([altListener]);
      expect(context.eventEmitter.events['myEvent']).not.toContain(listener);
      expect(context.eventEmitter.eventsOnce['myEvent']).not.toContain(listener);
    });

    it('removes a specific listener from one event', (context) => {
      context.eventEmitter.off('myEvent', listener);
      expect(context.eventEmitter.any).toStrictEqual([listener, altListener]);
      expect(context.eventEmitter.anyOnce).toStrictEqual([listener, altListener]);
      expect(context.eventEmitter.events['myEvent']).not.toContain(listener);
      expect(context.eventEmitter.events['myOtherEvent']).toContain(listener);
    });

    it('removes a specific listener from multiple events', (context) => {
      context.eventEmitter.off(['myEvent', 'myOtherEvent'], listener);
      expect(context.eventEmitter.events['myEvent']).not.toContain(listener);
      expect(context.eventEmitter.events['myOtherEvent']).not.toContain(listener);
      expect(context.eventEmitter.events['myThirdEvent']).toContain(listener);
    });

    it('removes all listeners from an event', (context) => {
      context.eventEmitter.off('myEvent');
      expect(context.eventEmitter.events['myEvent']).toBe(undefined);
      expect(context.eventEmitter.events['myOtherEvent']).toContain(listener);
    });

    it('removes all listeners from multiple events', (context) => {
      context.eventEmitter.off(['myEvent', 'myOtherEvent']);
      expect(context.eventEmitter.events['myEvent']).toBe(undefined);
      expect(context.eventEmitter.events['myOtherEvent']).toBe(undefined);
      expect(context.eventEmitter.events['myThirdEvent']).toContain(listener);
    });
  });

  describe('calling the listeners method', () => {
    beforeEach(async (context) => {
      const eventEmitter: EventEmitter<{ myEvent: string; myOtherEvent: string; myThirdEvent: string }> =
        new EventEmitter();
      eventEmitter.on(listener);
      eventEmitter.on(altListener);
      eventEmitter.on('myEvent', listener);
      eventEmitter.once(listener);
      eventEmitter.once(altListener);
      eventEmitter.once('myEvent', listener);
      eventEmitter.once('myEvent', altListener);
      context.eventEmitter = eventEmitter;
    });

    it('returns all listeners for a given event', (context) => {
      expect(context.eventEmitter.listeners('myEvent')).toHaveLength(3);
      expect(context.eventEmitter.listeners('myOtherEvent')).toBe(null);
      context.eventEmitter.on('myEvent', listener);
      expect(context.eventEmitter.listeners('myEvent')).toHaveLength(4);
      context.eventEmitter.once('myEvent', listener);
      expect(context.eventEmitter.listeners('myEvent')).toHaveLength(5);
    });
  });

  describe('calling the once method', () => {
    beforeEach(async (context) => {
      context.eventEmitter = new EventEmitter();
    });

    it('responds to an emit event when calling `once` without any parameters', (context) => {
      const promise = context.eventEmitter.once() as Promise<void>;
      const spy = vi.fn();
      promise.then(() => {
        spy();
        expect(spy).toHaveBeenCalledOnce();
      });
      context.eventEmitter.emit('myEvent');
    });

    it('adds a listener to anyOnce on calling `once` with a listener', (context) => {
      context.eventEmitter.once(listener);
      expect(context.eventEmitter.anyOnce).toHaveLength(1);
    });

    it('adds a listener to an eventOnce on calling `once` with a listener and event name', (context) => {
      context.eventEmitter.once('myEvent', listener);
      expect(context.eventEmitter.eventsOnce['myEvent']).toHaveLength(1);
    });

    it('adds a listener to multiple eventOnce fields on calling `once` with a listener and event name; and after emitting any of the events, all are removed', (context) => {
      context.eventEmitter.once(['myEvent', 'myOtherEvent', 'myThirdEvent'], listener);
      expect(context.eventEmitter.eventsOnce['myEvent']).toHaveLength(1);
      expect(context.eventEmitter.eventsOnce['myOtherEvent']).toHaveLength(1);
      expect(context.eventEmitter.eventsOnce['myThirdEvent']).toHaveLength(1);
      expect(context.eventEmitter.emit('myEvent'));
      expect(context.eventEmitter.eventsOnce['myEvent']).toBe(undefined);
      expect(context.eventEmitter.eventsOnce['myOtherEvent']).toBe(undefined);
      expect(context.eventEmitter.eventsOnce['myThirdEvent']).toBe(undefined);
    });
  });

  describe('calling the emit method', () => {
    const listener = () => true;
    beforeEach(async (context) => {
      context.eventEmitter = new EventEmitter();
      context.eventEmitter.once(listener);
    });

    it('emits an event on being called', (context) => {
      const spy = vi.fn();
      context.eventEmitter.on('myEvent', spy);
      expect(context.eventEmitter.listeners('myEvent')).toContain(spy);
      expect(spy).not.toHaveBeenCalled();
      context.eventEmitter.emit('myEvent');
      expect(spy).toHaveBeenCalled();
      // anyOnce must also be emptied
      expect(context.eventEmitter.anyOnce).toStrictEqual([]);
    });

    it('emits any events in anyOnce on emitting specific events', (context) => {
      context.eventEmitter.on('myEvent', listener);
      context.eventEmitter.emit('myEvent');
      expect(context.eventEmitter.anyOnce).toStrictEqual([]);
    });

    it('emits an event and removes it on being called for a once operation', (context) => {
      let target: boolean | undefined;
      const targetMutatorListener = () => (target = true);
      context.eventEmitter.once('myEvent', targetMutatorListener);
      expect(context.eventEmitter.listeners('myEvent')).toContain(targetMutatorListener);
      expect(target).toBe(undefined);
      context.eventEmitter.emit('myEvent');
      expect(target).toBe(true);
      expect(context.eventEmitter.listeners('myEvent')).not.toContain(targetMutatorListener);
      expect(context.eventEmitter.anyOnce).toStrictEqual([]);
    });
  });
});
