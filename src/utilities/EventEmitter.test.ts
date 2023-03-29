import { it, describe, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import EventEmitter, { removeListener } from './EventEmitter';

describe('Removes a listener from an array or object of listeners', () => {
  const listener = () => true;
  const altListener = () => false;
  
  const targetListenerArrayFixture1 = [altListener, listener, altListener];
  const targetListenerArrayFixture2 = [listener, altListener, listener];

  it('Successfully removes a listener from arrays', () => {
    const targetListeners = [[...targetListenerArrayFixture1], [...targetListenerArrayFixture2]];
    removeListener(targetListeners, listener);
    expect(targetListeners).toStrictEqual([[altListener, altListener], [altListener]]);
  });
  it('Successfully removes a listener from objects', () => {
    const targetListeners = [{
      'fixture1': [...targetListenerArrayFixture1],
      'fixture2': [...targetListenerArrayFixture2],
    }];
    removeListener(targetListeners, listener);
    expect(targetListeners).toStrictEqual([
      {
        'fixture1': [altListener, altListener],
        'fixture2': [altListener]
      }
    ]);
  });

  it('Successfully handles a mixture of objects and arrays', () => {
    const targetListeners = [{
      'fixture1': [...targetListenerArrayFixture1],
      'fixture2': [...targetListenerArrayFixture2],
    }, [...targetListenerArrayFixture1], [...targetListenerArrayFixture2]];
    removeListener(targetListeners, listener);
    expect(targetListeners).toStrictEqual([
      {
        'fixture1': [altListener, altListener],
        'fixture2': [altListener]
      },
      [altListener, altListener], [altListener]
    ],)
  });

  it('Only removes listeners from a filtered list of events', () => {
    const targetListeners = [{
      'fixture1': [...targetListenerArrayFixture1],
      'fixture2': [...targetListenerArrayFixture2],
    }];
    removeListener(targetListeners, listener, 'fixture2');
    expect(targetListeners).toStrictEqual([
      {
        'fixture1': [altListener, listener, altListener],
        'fixture2': [altListener]
      }
    ]);
    removeListener(targetListeners, altListener, 'fixture1');
    expect(targetListeners).toStrictEqual([
      {
        'fixture1': [listener],
        'fixture2': [altListener]
      }
    ]);
  })
});

describe('Event emitter class', () => {
  let eventEmitter: EventEmitter<{ 'myEvent': string, 'myOtherEvent': string, 'myThirdEvent': string }>;
  const listener = () => true;
  const altListener = () => false;

  afterEach(() => {
    eventEmitter = new EventEmitter();
  });

  describe('calling the on method', () => {
    beforeEach(() => {
      eventEmitter = new EventEmitter();
    });
    it('Adds a listener to the "any" set of event listeners', () => {
      eventEmitter.on(listener);
      expect(eventEmitter.any).toStrictEqual([listener]);
    });
    it('Adds a listener to a provided field of an event listener', () => {
      eventEmitter.on('myEvent', listener);
      expect(eventEmitter.events['myEvent']).toStrictEqual([listener]);
    });
    it('Adds a listener to all provided fields of an event listener', () => {
      eventEmitter.on(['myEvent', 'myOtherEvent', 'myThirdEvent'], listener);
      expect(eventEmitter.events['myEvent']).toStrictEqual([listener]);
      expect(eventEmitter.events['myOtherEvent']).toStrictEqual([listener]);
      expect(eventEmitter.events['myThirdEvent']).toStrictEqual([listener]);
    });
  });

  describe('calling the off method', () => {
    beforeEach(() => {
      eventEmitter = new EventEmitter();
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
    });

    it('Removes all listeners from all lists', () => {
      eventEmitter.off();
      expect(eventEmitter.any).toStrictEqual([]);
      expect(eventEmitter.anyOnce).toStrictEqual([]);
      expect(eventEmitter.events).toStrictEqual(Object.create(null));
      expect(eventEmitter.eventsOnce).toStrictEqual(Object.create(null));
    });

    it('Removes one listener from all lists', () => {
      eventEmitter.off(listener);
      expect(eventEmitter.any).toStrictEqual([altListener]);
      expect(eventEmitter.anyOnce).toStrictEqual([altListener]);
      expect(eventEmitter.events['myEvent']).not.toContain(listener);
      expect(eventEmitter.eventsOnce['myEvent']).not.toContain(listener);
    });

    it('Removes a specific listener from one event', () => {
      eventEmitter.off('myEvent', listener);
      expect(eventEmitter.any).toStrictEqual([listener, altListener]);
      expect(eventEmitter.anyOnce).toStrictEqual([listener, altListener]);
      expect(eventEmitter.events['myEvent']).not.toContain(listener);
      expect(eventEmitter.events['myOtherEvent']).toContain(listener);
    });

    it('Removes a specific listener from multiple events', () => {
      eventEmitter.off(['myEvent', 'myOtherEvent'], listener);
      expect(eventEmitter.events['myEvent']).not.toContain(listener);
      expect(eventEmitter.events['myOtherEvent']).not.toContain(listener);
      expect(eventEmitter.events['myThirdEvent']).toContain(listener);
    });

    it('Removes all listeners from an event', () => {
      eventEmitter.off('myEvent');
      expect(eventEmitter.events['myEvent']).toBe(undefined);
      expect(eventEmitter.events['myOtherEvent']).toContain(listener);
    });

    it('Removes all listeners from multiple events', () => {
      eventEmitter.off(['myEvent', 'myOtherEvent']);
      expect(eventEmitter.events['myEvent']).toBe(undefined);
      expect(eventEmitter.events['myOtherEvent']).toBe(undefined);
      expect(eventEmitter.events['myThirdEvent']).toContain(listener);
    });

  });

  describe('calling the listeners method', () => {
    beforeEach(() => {
      eventEmitter = new EventEmitter();
      eventEmitter.on(listener);
      eventEmitter.on(altListener);
      eventEmitter.on('myEvent', listener);
      eventEmitter.once(listener);
      eventEmitter.once(altListener);
      eventEmitter.once('myEvent', listener);
      eventEmitter.once('myEvent', altListener);
    });

    it('Returns all listeners for a given event', () => {
      expect(eventEmitter.listeners('myEvent')).toHaveLength(3);
      expect(eventEmitter.listeners('myOtherEvent')).toBe(null);
      eventEmitter.on('myEvent', listener);
      expect(eventEmitter.listeners('myEvent')).toHaveLength(4);
      eventEmitter.once('myEvent', listener);
      expect(eventEmitter.listeners('myEvent')).toHaveLength(5);
    });

  });

  describe('calling the once method', () => {
    beforeAll(() => {
      eventEmitter = new EventEmitter();
    });

    it('Adds a listener to anyOnce on calling `once` with a listener', () => {
      eventEmitter.once(listener);
      expect(eventEmitter.anyOnce).toHaveLength(1);
    });

    it('Adds a listener to an eventOnce on calling `once` with a listener and event name', () => {
      eventEmitter.once('myEvent', listener);
      expect(eventEmitter.eventsOnce['myEvent']).toHaveLength(1);
    });

    it('Adds a listener to multiple eventOnce fields on calling `once` with a listener and event name; And after emitting any of the events, all are removed', () => {
      eventEmitter.once(['myEvent', 'myOtherEvent', 'myThirdEvent'], listener);
      expect(eventEmitter.eventsOnce['myEvent']).toHaveLength(1);
      expect(eventEmitter.eventsOnce['myOtherEvent']).toHaveLength(1);
      expect(eventEmitter.eventsOnce['myThirdEvent']).toHaveLength(1);
      expect(eventEmitter.emit('myEvent'));
      expect(eventEmitter.eventsOnce['myEvent']).toBe(undefined);
      expect(eventEmitter.eventsOnce['myOtherEvent']).toBe(undefined);
      expect(eventEmitter.eventsOnce['myThirdEvent']).toBe(undefined);
    });
  });

  describe('calling the emit method', () => {
    beforeEach(() => {
      eventEmitter = new EventEmitter();
      eventEmitter.once(listener);
    });

    it('Emits an event on being called', () => {
      let target: boolean | undefined;
      const targetMutatorListener = () => target = true;
      eventEmitter.on('myEvent', targetMutatorListener);
      expect(eventEmitter.listeners('myEvent')).toContain(targetMutatorListener);
      expect(target).toBe(undefined);
      eventEmitter.emit('myEvent');
      expect(target).toBe(true);
      // anyOnce must also be emptied
      expect(eventEmitter.anyOnce).toStrictEqual([]);
    });

    it('Emits an event and removes it on being called for a once operation', () => {
      let target: boolean | undefined;
      const targetMutatorListener = () => target = true;
      eventEmitter.once('myEvent', targetMutatorListener);
      expect(eventEmitter.listeners('myEvent')).toContain(targetMutatorListener);
      expect(target).toBe(undefined);
      eventEmitter.emit('myEvent');
      expect(target).toBe(true);
      expect(eventEmitter.listeners('myEvent')).not.toContain(targetMutatorListener);
      expect(eventEmitter.anyOnce).toStrictEqual([]);
    });
  });



});
