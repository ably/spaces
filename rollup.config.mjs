import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'dist/iife/index.js',
  output: {
    format: 'iife',
    name: 'Spaces',
    file: 'dist/iife/index.bundle.js',
    globals: {
      ably: 'Ably',
    },
  },
  external: ['ably'],
  plugins: [nodeResolve({ browser: true })],
};
