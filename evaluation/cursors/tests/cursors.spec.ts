import { test, expect, Page, BrowserContext } from "@playwright/test";

// Options
// The number of simultaneous cursor moves. Each member uses a separate
// page.
const MEMBERS = process.env.MEMBERS || "5";

// Height in pixels of window (x)
const HEIGHT = 1200;
// Width in pixels of window (y)
const WIDTH = 1600;

// How many squares to draw
const SQUARES = 10;

const SQUARE_SIZE = 600;

const viewportSize = { width: WIDTH, height: HEIGHT };

test("default", async ({ context }) => {
  const now = new Date();
  console.log(`Started at ${now}`);

  let start = 0;
  await Promise.all(
    Array.from(Array(parseInt(MEMBERS))).map((_, i) => {
      start += 100;
      return instanceTest(i, context, { x: start, y: start });
    })
  );

  console.log(`Finished at ${new Date()}`);
});

async function instanceTest(
  id: number,
  context: BrowserContext,
  start: { x: number; y: number }
) {
  const page = await context.newPage();

  console.log(`Instance ${id} started`);
  await page.setViewportSize(viewportSize);

  // Pre-flight check that it's booted correctly
  await page.goto("/");
  await expect(page).toHaveTitle(/Cursors/);

  for (let i = 0; i < SQUARES; i++) {
    await square(page, start, SQUARE_SIZE);
  }

  console.log(`Instance ${id} finished`);
}

async function square(
  page: Page,
  start: { x: number; y: number },
  size: number = 500,
  steps: number = 100
) {
  await page.mouse.move(start.x, start.y, { steps: 0 });
  await page.mouse.move(start.x, start.y + size, { steps });
  await page.mouse.move(start.x + size, start.y + size, { steps });
  await page.mouse.move(start.x + size, start.y, { steps });
  await page.mouse.move(start.x, start.y, { steps });
}

async function circle() {}
