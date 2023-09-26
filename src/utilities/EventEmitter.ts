import { isArray, isFunction, isObject, isString } from './is.js';

function callListener<T, K extends keyof T>(eventThis: { event: K }, listener: EventListener<T, K>, arg: T[K]) {
  try {
    listener.apply(eventThis, [arg]);
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

/**
 * Describes the value of `this` inside the body of an {@link EventListener | `EventListener`} when invoked by an instance of {@link EventEmitter | `EventEmitter`} as the result of an event.
 *
 * @typeParam K The name of the event that this object corresponds to.
 */
export interface EventListenerThis<K> {
  /**
   * The name of the event.
   */
  event: K;
}

/**
 * A listener which {@link EventEmitter | `EventEmitter`} will invoke when a given event (as configured using {@link EventEmitter.on | `on()`} or {@link EventEmitter.once | `once()`}) occurs.
 *
 * @param this Inside the body of an event listener invoked by `EventEmitter`, the `this` variable provides access to an object containing the name of the event. (This will not be the case if the listener is an arrow function.)
 * @param param The data attached to this event.
 *
 * @typeParam T The type of event data that this listener will receive.
 * @typeParam K The name of the event that this listener will listen for.
 */
export type EventListener<T, K extends keyof T> = (this: EventListenerThis<K>, param: T[K]) => void;

/**
 * `EventEmitter` represents an object which is capable of emitting one or more events, which are identified by their name. It provides methods which allow you to listen for these events. It serves as the base class for all of the event-emitting classes in the Spaces SDK.
 *
 * @typeParam T An object type, the names of whose properties are the names of the events that an instance of this class can emit.
 */
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
   * @typeParam T An object type, the names of whose properties are the names of the events that the constructed object can emit.
   */
  constructor() {
    this.any = [];
    this.events = Object.create(null);
    this.anyOnce = [];
    this.eventsOnce = Object.create(null);
  }

  /**
   * {@label WITH_EVENTS}
   * Add an event listener
   * @param eventOrEvents the name of the event to listen to or the listener to be called.
   * @param listener (optional) the listener to be called.
   *
   * @typeParam K A type which allows one or more names of the properties of {@link T}.
   */
  on<K extends keyof T>(eventOrEvents?: K | K[], listener?: EventListener<T, K>): void;
  /**
   * Behaves the same as { @link on:WITH_EVENTS | the overload which accepts one or more event names }, but listens to _all_ events.
   * @param listener (optional) the listener to be called.
   */
  on(listener?: EventListener<T, keyof T>): void;
  /**
   * @internal
   * We add the implementation signature as an overload signature (but mark it as internal so that it does not appear in documentation) so that it can be called by subclasses.
   */
  on<K extends keyof T>(listenerOrEvents?: K | K[] | EventListener<T, K>, listener?: EventListener<T, K>): void;
  on<K extends keyof T>(listenerOrEvents?: K | K[] | EventListener<T, K>, listener?: EventListener<T, K>): void {
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
   * {@label WITH_EVENTS}
   * Remove one or more event listeners
   * @param eventOrEvents the name of the event whose listener is to be removed.
   * @param listener (optional) the listener to remove. If not supplied, all listeners are removed.
   *
   * @typeParam K A type which allows one or more names of the properties of {@link T}. TypeScript will infer this type based on the {@link eventOrEvents} argument.
   */
  off<K extends keyof T>(eventOrEvents?: K | K[], listener?: EventListener<T, K>): void;
  /**
   * Behaves the same as { @link off:WITH_EVENTS | the overload which accepts one or more event names }, but removes the listener from _all_ events.
   * @param listener (optional) the listener to remove. If not supplied, all listeners are removed.
   */
  off(listener?: EventListener<T, keyof T>): void;
  /**
   * @internal
   * We add the implementation signature as an overload signature (but mark it as internal so that it does not appear in documentation) so that it can be called by subclasses.
   */
  off<K extends keyof T>(listenerOrEvents?: K | K[] | EventListener<T, K>, listener?: EventListener<T, K>): void;
  off<K extends keyof T>(listenerOrEvents?: K | K[] | EventListener<T, K>, listener?: EventListener<T, K>): void {
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
   *
   * @typeParam K A type which allows a name of the properties of {@link T}. TypeScript will infer this type based on the {@link event} argument.
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
    const listeners: EventListener<T, K>[] = [];

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
      callListener(eventThis, listener, arg);
    });
  }

  /**
   * {@label WITH_EVENTS}
   * Listen for a single occurrence of an event
   * @param event the name of the event to listen to
   * @param listener (optional) the listener to be called
   *
   * @typeParam K A type which allows a name of one of the properties of {@link T}. TypeScript will infer this type based on the {@link event} argument.
   */
  once<K extends keyof T>(event: K, listener?: EventListener<T, K>): void | Promise<any>;
  /**
   * Behaves the same as { @link once:WITH_EVENTS | the overload which accepts one or more event names }, but listens for _all_ events.
   * @param listener (optional) the listener to be called
   */
  once(listener?: EventListener<T, keyof T>): void | Promise<any>;
  /**
   * @internal
   * We add the implementation signature as an overload signature (but mark it as internal so that it does not appear in documentation) so that it can be called by subclasses.
   */
  once<K extends keyof T>(
    listenerOrEvent: K | EventListener<T, K>,
    listener?: EventListener<T, K>,
  ): void | Promise<any>;
  once<K extends keyof T>(
    listenerOrEvent: K | EventListener<T, K>,
    listener?: EventListener<T, K>,
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
   * @param listenerArg the argument to pass to the listener
   */
  whenState<K extends keyof T>(
    targetState: K,
    currentState: keyof T,
    listener: EventListener<T, K>,
    listenerArg: T[K],
  ) {
    const eventThis = { event: targetState };

    if (typeof targetState !== 'string' || typeof currentState !== 'string') {
      throw new InvalidArgumentError('whenState requires a valid event String argument');
    }
    if (typeof listener !== 'function' && Promise) {
      return new Promise((resolve) => {
        EventEmitter.prototype.whenState.apply(this, [targetState, currentState, resolve, listenerArg]);
      });
    }
    if (targetState === currentState) {
      callListener(eventThis, listener, listenerArg);
    } else {
      this.once(targetState, listener);
    }
  }
}
