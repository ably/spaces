import { it, describe, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
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
    spy: Mock;
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
      context.spy = vi.fn();
    });

    it('adds a listener to the "any" set of event listeners', (context) => {
      context.eventEmitter.on(context.spy);
      expect(context.eventEmitter.any).toStrictEqual([context.spy]);
      context.eventEmitter.emit('myEvent');
      expect(context.spy).toHaveBeenCalledOnce();
    });

    it('adds a listener to a provided field of an event listener', (context) => {
      context.eventEmitter.on('myEvent', context.spy);
      expect(context.eventEmitter.events['myEvent']).toStrictEqual([context.spy]);
      context.eventEmitter.emit('myEvent');
      expect(context.spy).toHaveBeenCalledOnce();
    });

    it('adds a listener to all provided fields of an event listener', (context) => {
      context.eventEmitter.on(['myEvent', 'myOtherEvent', 'myThirdEvent'], context.spy);
      expect(context.eventEmitter.events['myEvent']).toStrictEqual([context.spy]);
      expect(context.eventEmitter.events['myOtherEvent']).toStrictEqual([context.spy]);
      expect(context.eventEmitter.events['myThirdEvent']).toStrictEqual([context.spy]);
      context.eventEmitter.emit('myEvent');
      expect(context.spy).toHaveBeenCalledTimes(1);
      context.eventEmitter.emit('myOtherEvent');
      expect(context.spy).toHaveBeenCalledTimes(2);
      context.eventEmitter.emit('myThirdEvent');
      expect(context.spy).toHaveBeenCalledTimes(3);
    });
  });

  describe('calling the off method', () => {
    beforeEach(async (context) => {
      context.spy = vi.fn();
      const eventEmitter: EventEmitter<{ myEvent: string; myOtherEvent: string; myThirdEvent: string }> =
        new EventEmitter();
      eventEmitter.on(context.spy);
      eventEmitter.on(altListener);
      eventEmitter.on('myEvent', context.spy);
      eventEmitter.on(['myEvent', 'myOtherEvent', 'myThirdEvent'], context.spy);
      eventEmitter.on('myEvent', altListener);
      eventEmitter.on(['myEvent', 'myOtherEvent', 'myThirdEvent'], altListener);
      eventEmitter.once(context.spy);
      eventEmitter.once(altListener);
      eventEmitter.once('myEvent', context.spy);
      eventEmitter.once('myEvent', altListener);
      eventEmitter.once(['myEvent', 'myOtherEvent', 'myThirdEvent'], altListener);
      context.eventEmitter = eventEmitter;
    });

    it('removes all listeners from all event queues', (context) => {
      context.eventEmitter.off();
      expect(context.eventEmitter.any).toStrictEqual([]);
      expect(context.eventEmitter.anyOnce).toStrictEqual([]);
      expect(context.eventEmitter.events).toStrictEqual(Object.create(null));
      expect(context.eventEmitter.eventsOnce).toStrictEqual(Object.create(null));
      context.eventEmitter.emit('myEvent');
      expect(context.spy).not.toHaveBeenCalled();
    });

    it('removes one listener from all lists', (context) => {
      context.eventEmitter.off(context.spy);
      expect(context.eventEmitter.any).toStrictEqual([altListener]);
      expect(context.eventEmitter.anyOnce).toStrictEqual([altListener]);
      expect(context.eventEmitter.events['myEvent']).not.toContain(context.spy);
      expect(context.eventEmitter.eventsOnce['myEvent']).not.toContain(context.spy);
      context.eventEmitter.emit('myEvent');
      expect(context.spy).not.toHaveBeenCalled();
    });

    it('removes a specific listener from one event', (context) => {
      context.eventEmitter.off('myEvent', context.spy);
      expect(context.eventEmitter.any).toStrictEqual([context.spy, altListener]);
      expect(context.eventEmitter.anyOnce).toStrictEqual([context.spy, altListener]);
      expect(context.eventEmitter.events['myEvent']).not.toContain(context.spy);
      expect(context.eventEmitter.events['myOtherEvent']).toContain(context.spy);
      context.eventEmitter.emit('myEvent');
      expect(context.spy).toHaveBeenCalledTimes(2);
      context.eventEmitter.emit('myOtherEvent');
      expect(context.spy).toHaveBeenCalledTimes(3);
    });

    it('removes a specific listener from multiple events', () => {
      const eventEmitter = new EventEmitter();
      const specificListener = vi.fn();
      eventEmitter.on(['myEvent', 'myOtherEvent', 'myThirdEvent'], specificListener);
      eventEmitter.off(['myEvent', 'myOtherEvent'], specificListener);
      expect(eventEmitter.events['myEvent']).toBe(undefined);
      expect(eventEmitter.events['myOtherEvent']).toBe(undefined);
      expect(eventEmitter.events['myThirdEvent']).toContain(specificListener);
      eventEmitter.emit('myEvent');
      eventEmitter.emit('myOtherEvent');
      expect(specificListener).not.toHaveBeenCalled();
      expect(eventEmitter.events['myThirdEvent']).toContain(specificListener);
      eventEmitter.emit('myThirdEvent');
      expect(specificListener).toHaveBeenCalledOnce();
    });

    it('removes all listeners from an event', (context) => {
      context.eventEmitter.off('myEvent');
      expect(context.eventEmitter.events['myEvent']).toBe(undefined);
      expect(context.eventEmitter.events['myOtherEvent']).toContain(context.spy);
    });

    it('removes all listeners from multiple events', (context) => {
      context.eventEmitter.off(['myEvent', 'myOtherEvent']);
      expect(context.eventEmitter.events['myEvent']).toBe(undefined);
      expect(context.eventEmitter.events['myOtherEvent']).toBe(undefined);
      expect(context.eventEmitter.events['myThirdEvent']).toContain(context.spy);
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
      context.spy = vi.fn();
    });

    it('responds to an emit event when calling `once` without any parameters', (context) => {
      expect(context.eventEmitter.once).toThrowError('invalid arguments:[null,null]');
    });

    it('adds a listener to anyOnce on calling `once` with a listener', (context) => {
      context.eventEmitter.once(context.spy);
      expect(context.eventEmitter.anyOnce).toHaveLength(1);
      context.eventEmitter.emit('myEvent');
      expect(context.spy).toHaveBeenCalledOnce();
      context.eventEmitter.emit('myOtherEvent');
    });

    it('adds a listener to an eventOnce on calling `once` with a listener and event name', (context) => {
      context.eventEmitter.once('myEvent', context.spy);
      expect(context.eventEmitter.eventsOnce['myEvent']).toHaveLength(1);
      context.eventEmitter.emit('myEvent');
      expect(context.spy).toHaveBeenCalledOnce();
      context.eventEmitter.emit('myEvent');
      expect(context.spy).toHaveBeenCalledOnce();
    });

    it('adds a listener to multiple eventOnce fields on calling `once` with a listener and event name; and after emitting any of the events, all are removed', (context) => {
      context.eventEmitter.once(['myEvent', 'myOtherEvent', 'myThirdEvent'], context.spy);
      expect(context.eventEmitter.eventsOnce['myEvent']).toHaveLength(1);
      expect(context.eventEmitter.eventsOnce['myOtherEvent']).toHaveLength(1);
      expect(context.eventEmitter.eventsOnce['myThirdEvent']).toHaveLength(1);
      expect(context.eventEmitter.emit('myEvent'));
      expect(context.eventEmitter.eventsOnce['myEvent']).toBe(undefined);
      expect(context.eventEmitter.eventsOnce['myOtherEvent']).toBe(undefined);
      expect(context.eventEmitter.eventsOnce['myThirdEvent']).toBe(undefined);
      expect(context.spy).toHaveBeenCalledOnce();
    });
  });

  describe('calling the emit method', () => {
    beforeEach(async (context) => {
      context.eventEmitter = new EventEmitter();
      context.spy = vi.fn();
      context.eventEmitter.once(listener);
    });

    it('emits an event on being called', (context) => {
      context.eventEmitter.on('myEvent', context.spy);
      expect(context.eventEmitter.listeners('myEvent')).toContain(context.spy);
      expect(context.spy).not.toHaveBeenCalled();
      context.eventEmitter.emit('myEvent');
      expect(context.spy).toHaveBeenCalledOnce();
      // anyOnce must also be emptied
      expect(context.eventEmitter.anyOnce).toStrictEqual([]);
    });

    it('emits any events in anyOnce on emitting specific events', (context) => {
      context.eventEmitter.on('myEvent', context.spy);
      context.eventEmitter.emit('myEvent');
      expect(context.eventEmitter.anyOnce).toStrictEqual([]);
      expect(context.spy).toHaveBeenCalledOnce();
    });

    it('emits an event and removes it on being called for a once operation', (context) => {
      context.eventEmitter.once('myEvent', context.spy);
      expect(context.eventEmitter.listeners('myEvent')).toContain(context.spy);
      context.eventEmitter.emit('myEvent');
      expect(context.eventEmitter.listeners('myEvent')).toBe(null);
      expect(context.eventEmitter.anyOnce).toStrictEqual([]);
      expect(context.spy).toHaveBeenCalledOnce();
    });
  });
});
