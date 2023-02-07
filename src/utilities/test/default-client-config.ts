const { ABLY_JS_LOG_LEVEL } = process.env;

export default {
  key: 'abc:def',
  useBinaryProtocol: false,
  log: {
    level: Number(ABLY_JS_LOG_LEVEL) || 1, // errors only,
    handler: console.log,
  },
};
