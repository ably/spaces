export default {
  input: 'dist/iife/index.js',
  output: {
    format: 'iife',
    name: 'Spaces',
    file: 'dist/iife/index.bundle.js',
    globals: {
      ably: 'Ably',
      nanoid: 'nanoid',
    },
  },
  external: ['ably', 'nanoid'],
};
