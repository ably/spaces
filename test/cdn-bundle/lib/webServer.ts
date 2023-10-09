import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

async function createFakeCDNDirectory() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ably-spaces-test-cdn-bundle'));
  await fs.cp(
    path.join(__dirname, '..', '..', '..', 'dist', 'iife', 'index.bundle.js'),
    path.join(tmpDir, 'ably-spaces-cdn-bundle.js'),
  );

  return tmpDir;
}

export async function startWebServer(listenPort: number) {
  const server = express();
  server.use(express.static(__dirname + '/../resources'));

  server.get('/', function (_req, res) {
    res.redirect('/test.html');
  });

  server.use('/node_modules', express.static(__dirname + '/../../../node_modules'));

  const fakeCDNDirectory = await createFakeCDNDirectory();
  server.use('/fake-cdn', express.static(fakeCDNDirectory));

  server.listen(listenPort);
}
