function typeOf(arg: unknown): string {
  return Object.prototype.toString.call(arg).slice(8, -1);
}

// Equivalent of Util.isObject from ably-js
function isObject(arg: unknown): arg is Record<string, unknown> {
  return typeOf(arg) === 'Object';
}

function isFunction(arg: unknown): arg is Function {
  return ['Function', 'AsyncFunction', 'GeneratorFunction', 'Proxy'].includes(typeOf(arg));
}

function isString(arg: unknown): arg is String {
  return typeOf(arg) === 'String';
}

function isArray<T>(arg: unknown): arg is Array<T> {
  return Array.isArray(arg);
}

export { isArray, isFunction, isObject, isString };
