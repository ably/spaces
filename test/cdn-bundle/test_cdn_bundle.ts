/*
 * test_cdn_bundle.ts:
 *
 * Tests the bundle that the .github/workflows/cdn.yml workflow will upload to the CDN.
 *
 * It does this by checking that a webpage which imports this bundle is able to create and use a Spaces client.
 */

import playwright from 'playwright';
import { createSandboxAblyAPIKey } from '../lib/ably_sandbox.js';
import { startWebServer } from './lib/web_server.js';

async function runTest(testPageURL: URL) {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();

  page.on('console', (consoleMessage) => {
    console.log('[browser]', consoleMessage);
  });

  const pageResultPromise = new Promise<void>((resolve, reject) => {
    page.exposeFunction('onResult', (error: Error | null) => {
      if (error) {
        console.log('Browser returned control to test runner, with error', error);
        reject(error);
      } else {
        console.log('Browser returned control to test runner');
        resolve();
      }
    });

    page.exposeFunction('createSandboxAblyAPIKey', createSandboxAblyAPIKey);
  });

  console.log('Running test in browser');

  try {
    await page.goto(testPageURL.toString());
    await pageResultPromise;
  } finally {
    await browser.close();
  }
}

(async () => {
  const port = 4567;
  const webServer = await startWebServer(port);

  try {
    await runTest(new URL(`http://localhost:${port}`));
  } finally {
    await webServer.stop();
  }
})();
