import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  webServer: {
    command: 'npm run test:cdn-server',
    url: 'http://localhost:4567',
  },
  use: {
    baseURL: 'http://localhost:4567',
  },
});
