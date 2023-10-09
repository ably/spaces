import { startWebServer } from './lib/webServer.js';

(async () => {
  await startWebServer(4567);
})();
