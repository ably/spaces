import { test, expect } from '@playwright/test';
import { createSandboxAblyAPIKey } from '../../lib/ablySandbox.js';

test.describe('CDN bundle', () => {
  /**
   * Tests the bundle that the .github/workflows/cdn.yml workflow will upload to the CDN.
   *
   * It does this by checking that a webpage which imports this bundle is able to create and use a Spaces client.
   */
  test('browser can import and use the CDN bundle', async ({ page }) => {
    let resolvePageResult: (value: PromiseLike<string> | string) => void;
    let rejectPageResult: (reason: any) => void;

    const pageResultPromise = new Promise<string>((resolve, reject) => {
      resolvePageResult = resolve;
      rejectPageResult = reject;
    });

    await page.exposeFunction('onResult', (error: Error | null) => {
      if (error) {
        rejectPageResult(error);
      } else {
        resolvePageResult('Success');
      }
    });

    await page.exposeFunction('createSandboxAblyAPIKey', createSandboxAblyAPIKey);

    await page.goto('/');

    await expect(async () => {
      const result = await pageResultPromise;
      expect(result).toEqual('Success');
    }).toPass();
  });
});
