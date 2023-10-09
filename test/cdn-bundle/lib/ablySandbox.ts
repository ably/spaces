import https from 'node:https';
import testAppSetup from '../../ably-common/test-resources/test-app-setup.json';

export interface TestApp {
  keys: TestAppKey[];
}

export interface TestAppKey {
  id: string;
  value: string;
  keyName: string;
  keySecret: string;
  keyStr: string;
  capability: string;
  expires: number;
}

export async function createSandboxAblyAPIKey() {
  const data = await new Promise<Buffer>((resolve, reject) => {
    const request = https.request(
      {
        hostname: 'sandbox-rest.ably.io',
        path: '/apps',
        port: 443,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      (incomingMessage) => {
        if (!(incomingMessage.statusCode && incomingMessage.statusCode >= 200 && incomingMessage.statusCode < 300)) {
          throw new Error(`Unexpected status code ${incomingMessage.statusCode}`);
        }

        let data: Buffer | null;
        incomingMessage.on('error', reject);
        incomingMessage.on('data', (dataChunk: Buffer) => {
          if (data) {
            data = Buffer.concat([data, dataChunk]);
          } else {
            data = dataChunk;
          }
        });
        incomingMessage.on('end', () => {
          resolve(data!);
        });
      },
    );

    request.on('error', reject);

    request.write(JSON.stringify(testAppSetup.post_apps), (error) => {
      if (error) {
        reject(error);
      }
      request.end();
    });
  });

  const testApp = JSON.parse(data.toString()) as TestApp;

  return testApp.keys[0].keyStr;
}
