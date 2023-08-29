import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
  input: 'dist/iife/index.js',
  output: {
    format: 'iife',
    name: 'Spaces',
    file: 'dist/iife/index.bundle.js',
    globals: {
      ably: 'Ably',
    },
    compact: true,
    plugins: [terser()],
  },
  external: ['ably'],
  plugins: [nodeResolve({ browser: true })],
};
