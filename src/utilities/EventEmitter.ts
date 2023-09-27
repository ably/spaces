import { isArray, isFunction, isObject, isString } from './is.js';

function callListener<K>(eventThis: { event: K }, listener: Function, args: unknown[]) {
  try {
    listener.apply(eventThis, args);
  } catch (e) {
    console.error(
      'EventEmitter.emit()',
      'Unexpected listener exception: ' + e + '; stack = ' + (e && (e as Error).stack),
    );
  }
}

/**
 * Remove listeners that match listener
 * @param targetListeners is an array of listener arrays or event objects with arrays of listeners
 * @param listener the listener callback to remove
 * @param eventFilter (optional) event name instructing the function to only remove listeners for the specified event
 */
export function removeListener<T>(
  targetListeners: (Function[] | Record<keyof T, Function[]>)[],
  listener: Function,
  eventFilter?: keyof T,
) {
  let listeners: Function[] | Record<keyof T, Function[]>;
  let index: number;
  let eventName: keyof T;

  for (let targetListenersIndex = 0; targetListenersIndex < targetListeners.length; targetListenersIndex++) {
    listeners = targetListeners[targetListenersIndex];

    if (isString(eventFilter) && isObject(listeners)) {
      listeners = listeners[eventFilter];
    }

    if (isArray(listeners)) {
      while ((index = listeners.indexOf(listener)) !== -1) {
        listeners.splice(index, 1);
      }
      /* If events object has an event name key with no listeners then
				 remove the key to stop the list growing indefinitely */
      const parentCollection = targetListeners[targetListenersIndex];
      if (eventFilter && listeners.length === 0 && isObject(parentCollection)) {
        delete parentCollection[eventFilter];
      }
    } else if (isObject(listeners)) {
      for (eventName in listeners) {
        if (Object.prototype.hasOwnProperty.call(listeners, eventName) && isArray(listeners[eventName])) {
          removeListener([listeners], listener, eventName);
        }
      }
    }
  }
}

// Equivalent of Platform.config.inspect from ably-js for browser/RN
export function inspect(args: unknown): string {
  return JSON.stringify(args);
}

export class InvalidArgumentError extends Error {
  constructor(...args: [string | undefined]) {
    super(...args);
  }
}

export type EventListener<T> = (params: T) => void;

export default class EventEmitter<T> {
  /** @internal */
  any: Array<Function>;
  /** @internal */
  events: Record<keyof T, Function[]>;
  /** @internal */
  anyOnce: Array<Function>;
  /** @internal */
  eventsOnce: Record<keyof T, Function[]>;

  /**
   * @internal
   */
  constructor() {
    this.any = [];
    this.events = Object.create(null);
    this.anyOnce = [];
    this.eventsOnce = Object.create(null);
  }

  /**
   * Add an event listener
   * @param listenerOrEvents (optional) the name of the event to listen to or the listener to be called.
   * @param listener (optional) the listener to be called.
   */
  on<K extends keyof T>(listenerOrEvents?: K | K[] | EventListener<T[K]>, listener?: EventListener<T[K]>): void {
    // .on(() => {})
    if (isFunction(listenerOrEvents)) {
      this.any.push(listenerOrEvents);
      return;
    }

    // .on("eventName", () => {})
    if (isString(listenerOrEvents) && isFunction(listener)) {
      const listeners = this.events[listenerOrEvents] || (this.events[listenerOrEvents] = []);
      listeners.push(listener);
      return;
    }

    // .on(["eventName"], () => {})
    if (isArray(listenerOrEvents) && isFunction(listener)) {
      listenerOrEvents.forEach((eventName) => {
        this.on(eventName, listener);
      });
      return;
    }

    throw new InvalidArgumentError('EventEmitter.on(): Invalid arguments: ' + inspect([listenerOrEvents, listener]));
  }

  /**
   * Remove one or more event listeners
   * @param listenerOrEvents (optional) the name of the event whose listener is to be removed. If not supplied,
   * the listener is treated as an 'any' listener.
   * @param listener (optional) the listener to remove. If not supplied, all listeners are removed.
   */
  off<K extends keyof T>(listenerOrEvents?: K | K[] | EventListener<T[K]>, listener?: EventListener<T[K]>): void {
    // .off()
    // don't use arguments.length === 0 here as don't won't handle
    // cases like .off(undefined) which is a valid call
    if (!listenerOrEvents && !listener) {
      this.any = [];
      this.events = Object.create(null);
      this.anyOnce = [];
      this.eventsOnce = Object.create(null);
      return;
    }

    // .off(() => {})
    if (isFunction(listenerOrEvents)) {
      removeListener([this.any, this.events, this.anyOnce, this.eventsOnce], listenerOrEvents);
      return;
    }

    // .off("eventName", () => {})
    if (isString(listenerOrEvents) && isFunction(listener)) {
      removeListener([this.events, this.eventsOnce], listener, listenerOrEvents);
      return;
    }

    // .off("eventName")
    if (isString(listenerOrEvents)) {
      delete this.events[listenerOrEvents];
      delete this.eventsOnce[listenerOrEvents];
      return;
    }

    // .off(["eventName"], () => {})
    if (isArray(listenerOrEvents) && isFunction(listener)) {
      listenerOrEvents.forEach((eventName) => {
        this.off(eventName, listener);
      });
      return;
    }

    // .off(["eventName"])
    if (isArray(listenerOrEvents)) {
      listenerOrEvents.forEach((eventName) => {
        this.off(eventName);
      });
      return;
    }

    throw new InvalidArgumentError('EventEmitter.off(): invalid arguments:' + inspect([listenerOrEvents, listener]));
  }

  /**
   * Get the array of listeners for a given event; excludes once events
   * @param event (optional) the name of the event, or none for 'any'
   * @return array of events, or null if none
   */
  listeners<K extends keyof T>(event: K): Function[] | null {
    if (event) {
      const listeners = [...(this.events[event] ?? [])];

      if (isArray(this.eventsOnce[event])) {
        Array.prototype.push.apply(listeners, this.eventsOnce[event]);
      }

      return listeners.length ? listeners : null;
    }

    return this.any.length ? this.any : null;
  }

  /**
   * @internal
   *
   * Emit an event
   * @param event the event name
   * @param arg the arguments to pass to the listener
   */
  emit<K extends keyof T>(event: K, arg: T[K]) {
    const eventThis = { event };
    const listeners: Function[] = [];

    if (this.anyOnce.length > 0) {
      Array.prototype.push.apply(listeners, this.anyOnce);
      this.anyOnce = [];
    }

    if (this.any.length > 0) {
      Array.prototype.push.apply(listeners, this.any);
    }

    const eventsOnceListeners = this.eventsOnce[event];
    if (eventsOnceListeners) {
      Array.prototype.push.apply(listeners, eventsOnceListeners);
      delete this.eventsOnce[event];
    }

    const eventsListeners = this.events[event];
    if (eventsListeners) {
      Array.prototype.push.apply(listeners, eventsListeners);
    }

    listeners.forEach(function (listener) {
      callListener(eventThis, listener, [arg]);
    });
  }

  /**
   * Listen for a single occurrence of an event
   * @param listenerOrEvent (optional) the name of the event to listen to
   * @param listener (optional) the listener to be called
   */
  once<K extends keyof T>(
    listenerOrEvent: K | EventListener<T[K]>,
    listener?: EventListener<T[K]>,
  ): void | Promise<any> {
    // .once("eventName", () => {})
    if (isString(listenerOrEvent) && isFunction(listener)) {
      const listeners = this.eventsOnce[listenerOrEvent] || (this.eventsOnce[listenerOrEvent] = []);
      listeners.push(listener);
      return;
    }

    // .once(() => {})
    if (isFunction(listenerOrEvent)) {
      this.anyOnce.push(listenerOrEvent);
      return;
    }

    throw new InvalidArgumentError('EventEmitter.once(): invalid arguments:' + inspect([listenerOrEvent, listener]));
  }

  /**
   * @internal
   *
   * Listen for a single occurrence of a state event and fire immediately if currentState matches targetState
   * @param targetState the name of the state event to listen to
   * @param currentState the name of the current state of this object
   * @param listener the listener to be called
   * @param listenerArgs
   */
  whenState(
    targetState: keyof T,
    currentState: keyof T,
    listener: EventListener<T[keyof T]>,
    ...listenerArgs: unknown[]
  ) {
    const eventThis = { event: targetState };

    if (typeof targetState !== 'string' || typeof currentState !== 'string') {
      throw new InvalidArgumentError('whenState requires a valid event String argument');
    }
    if (typeof listener !== 'function' && Promise) {
      return new Promise((resolve) => {
        EventEmitter.prototype.whenState.apply(
          this,
          [targetState, currentState, resolve].concat(listenerArgs as any[]) as any,
        );
      });
    }
    if (targetState === currentState) {
      callListener(eventThis, listener, listenerArgs);
    } else {
      this.once(targetState, listener);
    }
  }
}
