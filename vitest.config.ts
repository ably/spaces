import { configDefaults, defineConfig } from 'vitest/config';


export default defineConfig({
  test: {
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
    exclude: [...configDefaults.exclude, 'test/ably-common', 'test/cdn-bundle']
  },
});
