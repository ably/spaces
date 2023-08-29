/*
 * A script to move a cursor in a circle.
 *
 *     npm run circle
 */
import "dotenv/config";
import Ably from 'ably';
import Spaces from '@ably-labs/spaces';
import { nanoid } from 'nanoid';
import { generateUsername } from 'unique-username-generator';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
const argv = yargs(hideBin(process.argv))
  .options({
    count: { type: 'number', default: 1 },
    radius: { type: 'number', default: 50 },
    batchinterval: { type: 'number', default: 100 },
    startdelay: { type: 'number', default: 2000 },
  })
  .parseSync();

console.log("Environment:", process.env.VITE_ABLY_ENV || process.env.ABLY_ENV);
console.log("Circle count:", argv.count);

const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const circle = async (id: number) => {
  const client = new Ably.Realtime.Promise({
    key: process.env.VITE_ABLY_API_KEY || process.env.ABLY_API_KEY,
    environment: process.env.VITE_ABLY_ENV || process.env.ABLY_ENV,
    clientId: nanoid(),
  });

  const spaces = new Spaces(client);

  const space = await spaces.get('demo', { cursors: { outboundBatchInterval: argv.batchinterval } });

  await space.enter({ username: generateUsername() });

  const radius = argv.radius;
  const steps = 60;

  const center_x = radius + Math.random() * 800;
  const center_y = radius + Math.random() * 600;

  console.log(`${id}: moving cursor in a circle radius=${radius} around x=${center_x} y=${center_y}`);

  while (true) {
    for (let i = 0; i < steps; i++) {
      const x = center_x + radius * Math.sin((2 * Math.PI * i) / steps);
      const y = center_y + radius * Math.cos((2 * Math.PI * i) / steps);
      space.cursors.set({ position: { x, y }, data: {} });
      await sleep(1000 / steps);
    }
  }
};

for (let n = 1; n <= argv.count; n++) {
  console.log(`waiting ${argv.startdelay}ms to start circle ${n}`);
  await sleep(argv.startdelay);

  console.log(`starting circle ${n}`);
  circle(n);
}
