import { test, expect } from '@playwright/test';
import { createSandboxAblyAPIKey } from '../lib/ablySandbox.js';

test.describe('CDN bundle', () => {
  /**
   * Tests the bundle that the .github/workflows/cdn.yml workflow will upload to the CDN.
   *
   * It does this by checking that a webpage which imports this bundle is able to create and use a Spaces client.
   */
  test('browser can import and use the CDN bundle', async ({ page }) => {
    const pageResultPromise = new Promise<string>((resolve, reject) => {
      page.exposeFunction('onResult', (error: Error | null) => {
        if (error) {
          reject(error);
        } else {
          resolve('Success');
        }
      });

      page.exposeFunction('createSandboxAblyAPIKey', createSandboxAblyAPIKey);
    });

    await page.goto('/');

    await expect(async () => {
      const result = await pageResultPromise;
      expect(result).toEqual('Success');
    }).toPass();
  });
});
