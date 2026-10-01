import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
  input: 'dist/iife/index.js',
  output: {
    format: 'iife',
    name: 'AblySpaces',
    file: 'dist/iife/index.bundle.js',
    globals: {
      '@ably/pubsub-core': 'AblyPubSub',
    },
    compact: true,
    plugins: [terser()],
  },
  external: ['@ably/pubsub-core'],
  plugins: [nodeResolve({ browser: true })],
};
