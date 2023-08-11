/*
 * A script to move a cursor in random directions.
 *
 *     npm run random
 */
import 'dotenv/config';
import Ably from 'ably';
import Spaces from '@ably-labs/spaces';
import { nanoid } from 'nanoid';
import { generateUsername } from 'unique-username-generator';

console.log('Environment:', process.env.VITE_ABLY_ENV || process.env.ABLY_ENV);

const client = new Ably.Realtime.Promise({
  key: process.env.VITE_ABLY_API_KEY || process.env.ABLY_API_KEY,
  environment: process.env.VITE_ABLY_ENV || process.env.ABLY_ENV,
  clientId: nanoid(),
});

const spaces = new Spaces(client);

const space = await spaces.get('demo');

await space.enter({ username: generateUsername() });

const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

console.log('moving cursors randomly around the screen');

let xSrc = 0;
let ySrc = 0;

while (true) {
  space.cursors.set({ position: { xSrc, ySrc }, data: {} });

  let xDest = Math.random() * 800;
  let yDest = Math.random() * 600;

  let steps = Math.floor((xSrc + ySrc + xDest + yDest) / 20);

  let xInterval = (xDest - xSrc) / steps;
  let yInterval = (yDest - ySrc) / steps;

  let x = xSrc;
  let y = ySrc;

  for (let i = 0; i < steps; i++) {
    x = x + xInterval;
    y = y + yInterval;
    space.cursors.set({ position: { x, y }, data: {} });
    await sleep(1000 / steps);
  }

  xSrc = xDest;
  ySrc = yDest;
}
