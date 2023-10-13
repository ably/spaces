// /*
//  * test_cdn_bundle.ts:
//  *
//  * Tests the bundle that the .github/workflows/cdn.yml workflow will upload to the CDN.
//  *
//  * It does this by checking that a webpage which imports this bundle is able to create and use a Spaces client.
//  */

import { test, expect } from '@playwright/test';
import { createSandboxAblyAPIKey } from '../lib/ablySandbox.js';

test.describe('CDN bundle', () => {
  test('creates and enters a space', async ({ page }) => {
    const pageResultPromise = new Promise<void>((resolve, reject) => {
      page.exposeFunction('onResult', (error: Error | null) => {
        if (error) {
          reject(error);
        } else {
          // @ts-ignore
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
