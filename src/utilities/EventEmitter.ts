function callListener(eventThis: { event: string }, listener: Function, args: unknown[]) {
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
export function removeListener(
  targetListeners: (Function[] | Record<string, Function[]>)[],
  listener: Function,
  eventFilter?: string,
) {
  let listeners: Function[] | Record<string, Function[]>;
  let index;
  let eventName;

  for (let targetListenersIndex = 0; targetListenersIndex < targetListeners.length; targetListenersIndex++) {
    listeners = targetListeners[targetListenersIndex];

    if (eventFilter) {
      listeners = listeners[eventFilter];
    }

    if (isArray(listeners)) {
      while ((index = listeners.indexOf(listener)) !== -1) {
        listeners.splice(index, 1);
      }
      /* If events object has an event name key with no listeners then
				 remove the key to stop the list growing indefinitely */
      if (eventFilter && listeners.length === 0) {
        delete targetListeners[targetListenersIndex][eventFilter];
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
function inspect(args: any): string {
  return JSON.stringify(args);
}

function typeOf(arg: unknown): string {
  return Object.prototype.toString.call(arg).slice(8, -1);
}

// Equivalent of Util.isObject from ably-js
function isObject(arg: unknown): arg is Record<string, unknown> {
  return typeOf(arg) === 'Object';
}

function isFunction(arg: unknown): arg is Function {
  return typeOf(arg) === 'Function';
}

function isString(arg: unknown): arg is String {
  return typeOf(arg) === 'String';
}

function isArray<T>(arg: unknown): arg is Array<T> {
  return Array.isArray(arg);
}

type EventMap = Record<string, any>;
// extract all the keys of an event map and use them as a type
type EventKey<T extends EventMap> = string & keyof T;
export type EventListener<T> = (params: T) => void;

export default class EventEmitter<T extends EventMap> {
  any: Array<Function>;
  events: Record<string, Function[]>;
  anyOnce: Array<Function>;
  eventsOnce: Record<string, Function[]>;

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
  on<K extends EventKey<T>>(listenerOrEvents?: K | K[] | EventListener<T[K]>, listener?: EventListener<T[K]>): void {
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

    throw new Error('EventEmitter.on(): Invalid arguments: ' + inspect([listenerOrEvents, listener]));
  }

  /**
   * Remove one or more event listeners
   * @param listenerOrEvents (optional) the name of the event whose listener is to be removed. If not supplied,
   * the listener is treated as an 'any' listener.
   * @param listener (optional) the listener to remove. If not supplied, all listeners are removed.
   */
  off<K extends EventKey<T>>(listenerOrEvents?: K | K[] | EventListener<T[K]>, listener?: EventListener<T[K]>): void {
    // .off()
    if (arguments.length === 0) {
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

    throw new Error('EventEmitter.off(): invalid arguments:' + inspect([listenerOrEvents, listener]));
  }

  /**
   * Get the array of listeners for a given event; excludes once events
   * @param event (optional) the name of the event, or none for 'any'
   * @return array of events, or null if none
   */
  listeners<K extends EventKey<T>>(event: K): Function[] | null {
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
   * Emit an event
   * @param event the event name
   * @param args the arguments to pass to the listener
   */
  emit<K extends EventKey<T>>(event: K, ...args: unknown[] /* , args... */) {
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
      callListener(eventThis, listener, args);
    });
  }

  /**
   * Listen for a single occurrence of an event
   * @param listenerOrEvents (optional) the name of the event to listen to
   * @param listener (optional) the listener to be called
   */
  once<K extends EventKey<T>>(
    listenerOrEvents: K | K[] | EventListener<T[K]>,
    listener?: EventListener<T[K]>,
  ): void | Promise<any> {
    // .once("eventName", () => {})
    if (isString(listenerOrEvents) && isFunction(listener)) {
      const listeners = this.eventsOnce[listenerOrEvents] || (this.eventsOnce[listenerOrEvents] = []);
      listeners.push(listener);
      return;
    }

    // .once(["eventName"], () => {})
    if (isArray(listenerOrEvents) && isFunction(listener)) {
      const self = this;
      listenerOrEvents.forEach(function (eventName) {
        const listenerWrapper = function (listenerThis: any) {
          const innerArgs = Array.prototype.slice.call(arguments);
          listenerOrEvents.forEach((eventName) => {
            self.off(eventName, this);
          });
          listener.apply(listenerThis, innerArgs);
        };
        self.once(eventName, listenerWrapper);
      });

      return;
    }

    // .once(() => {})
    if (isFunction(listenerOrEvents)) {
      this.anyOnce.push(listenerOrEvents);
      return;
    }

    throw new Error('EventEmitter.once(): invalid arguments:' + inspect([listenerOrEvents, listener]));
  }

  /**
   * Private API
   *
   * Listen for a single occurrence of a state event and fire immediately if currentState matches targetState
   * @param targetState the name of the state event to listen to
   * @param currentState the name of the current state of this object
   * @param listener the listener to be called
   * @param listenerArgs
   */
  whenState(targetState: string, currentState: string, listener: EventListener<T>, ...listenerArgs: unknown[]) {
    const eventThis = { event: targetState };

    if (typeof targetState !== 'string' || typeof currentState !== 'string') {
      throw 'whenState requires a valid event String argument';
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
