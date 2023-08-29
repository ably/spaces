import "./style.css";

import Spaces from "@ably-labs/spaces"

import { Realtime } from "ably";
import { nanoid } from "nanoid";
import { generateUsername } from "unique-username-generator";

const client = new Realtime.Promise({
  key: import.meta.env.VITE_ABLY_API_KEY,
  environment: import.meta.env.VITE_ABLY_ENV,
  clientId: nanoid(),
});
const spaces = new Spaces(client);

const space = await spaces.get("demo");

space.enter({ username: generateUsername() });

// Publish a CursorUpdate with the location of a mouse, including optional data for the current member
window.addEventListener("mousemove", ({ clientX, clientY }) => {
  space.cursors.set({
    position: { x: clientX, y: clientY },
    data: { color: "red" },
  });
});

// Listen to events published on "mousemove" by all members
space.cursors.subscribe("update", async (update: any) => {
  const self = await space.members.getSelf();

  let cursorNode: HTMLElement | null = document.querySelector(
    `#cursor-${update.connectionId}`
  );

  const members = await space.members.getAll();
  const member = members
    .find((member) => member.connectionId === update.connectionId);

  if (!member || self?.connectionId === update.connectionId) return;

  if (!(cursorNode instanceof HTMLElement)) {
    cursorNode = createCursor(update.connectionId);
    document.body.appendChild(cursorNode);
  }

  cursorNode.style.left = update.position.x + "px";
  cursorNode.style.top = update.position.y + "px";
});

function randomColour() {
  return "#" + (((1 << 24) * Math.random()) | 0).toString(16).padStart(6, "0");
}

const cursorSvg = (startColor = "#06B6D4", endColor = "#3B82F6", id: string) => {
  return `
    <svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0.391407 3.21084L7.76105 25.3198C8.27823 26.8713 10.2474 27.3361 11.4038 26.1797L26.1431 11.4404C27.2995 10.284 26.8347 8.31485 25.2831 7.79767L3.17421 0.42803C1.45434 -0.145257 -0.181883 1.49097 0.391407 3.21084Z" fill="url(#gradient-${id})"/>
      <defs>
        <linearGradient id="gradient-${id}" x1="28.6602" y1="-0.963373" x2="-0.999994" y2="28.6968" gradientUnits="userSpaceOnUse">
          <stop stop-color="${startColor}"/>
          <stop offset="1" stop-color="${endColor}"/>
        </linearGradient>
      </defs>
    </svg>`;
};

const createCursor = (
  connectionId: string,
): HTMLElement => {
  const container = document.createElement("div");
  container.id = `cursor-${connectionId}`;
  container.style.position = "absolute";
  container.style.transition = "all 50ms ease-out";

  const cursor = document.createElement("div");
  const colour = randomColour();
  cursor.innerHTML = cursorSvg(colour, colour, connectionId);

  container.appendChild(cursor);

  return container;
};
