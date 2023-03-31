import * as Ably from 'ably/promises';

import { nanoid } from 'nanoid';
import { throttle } from 'lodash';

import { getRandomName } from './utils/fake-names';
import { getSpaceNameFromUrl } from './utils/url';

import Spaces from '../../src/Spaces';
import { renderAvatars, renderSelfAvatar } from './components/avatar-stack';

const cursorSVG = `
<svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_429_11096)">
<path d="M11 20.9999L4 3.99994L21 10.9999L14.7353 13.6848C14.2633 13.8871 13.8872 14.2632 13.6849 14.7353L11 20.9999Z" stroke="#292929" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</g>
<defs>
<clipPath id="clip0_429_11096">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>
</svg>
`;

function cubicBezierCurve(P0, P1, P2, P3, numPoints) {
  const points = [];

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const x = Math.round(
      (1 - t) ** 3 * P0.x + 3 * t * (1 - t) ** 2 * P1.x + 3 * t ** 2 * (1 - t) * P2.x + t ** 3 * P3.x
    );
    const y = Math.round(
      (1 - t) ** 3 * P0.y + 3 * t * (1 - t) ** 2 * P1.y + 3 * t ** 2 * (1 - t) * P2.y + t ** 3 * P3.y
    );
    points.push({ x, y, connectionId: P0.connectionId });
  }

  return points;
}

const createOrUpdateCursor = ({ x, y }, members, cursorsContainer, connectionId) => {
  const node = members[connectionId];

  if (node) {
    node.style.top = `${y}px`;
    node.style.left = `${x}px`;
  } else {
    const userCursor = document.createElement('span');
    userCursor.innerHTML = cursorSVG;
    userCursor.style.display = 'block';
    userCursor.style.position = 'fixed';
    userCursor.style.transition = 'all 16ms';
    userCursor.style.top = `${y}px`;
    userCursor.style.left = `${x}px`;
    members[connectionId] = userCursor;
    cursorsContainer.appendChild(userCursor);
  }
};

const cursorTracking = (client) => {
  const cursorsContainer = document.querySelector('#cursors-container');
  const cursorChannel = client.channels.get('cursors:namespace');
  const connectionId = client.connection.id;
  const members = {};
  let receivedMsgCounter = 0;
  let publishedMsgCounter = 0;
  let finalBatchLength = 0;

  const PUBLISH_THROTTLE = 100;
  const BEZIER_RESOLUTION = 60;
  const BATCH_BOUNDARY = 4;

  // Naive message counting
  setInterval(() => {
    console.log('Messages received: ', receivedMsgCounter);
    console.log('----------');
    console.log('Messages published: ', publishedMsgCounter);
    console.log('Current batch length: ', finalBatchLength);
    receivedMsgCounter = 0;
    publishedMsgCounter = 0;
  }, 1000);

  let batch = [];

  const throttledPublish = throttle(() => {
    if (batch.length > BATCH_BOUNDARY) {
      const step = Math.floor(batch.length / 4);
      batch = cubicBezierCurve(batch[0], batch[step], batch[step * 2], batch[batch.length - 1], BEZIER_RESOLUTION);
    }

    publishedMsgCounter++;
    cursorChannel.publish('update', { type: 'move', positions: batch, connectionId });
    finalBatchLength = batch.length;
    batch = [];
  }, PUBLISH_THROTTLE);

  window.addEventListener(
    'mousemove',
    throttle(({ clientX, clientY }) => {
      batch.push({ x: clientX, y: clientY, connectionId });
      throttledPublish(batch);
    }, 0)
  );

  cursorChannel.subscribe((message) => {
    message.data.positions.forEach((position) => {
      // Ignore echo
      if (connectionId === position.connectionId) return;
      window.requestAnimationFrame(() =>
        createOrUpdateCursor(position, members, cursorsContainer, message.data.connectionId)
      );
    });

    receivedMsgCounter++;
  });
};

(async () => {
  const clientId = nanoid();
  const ably = new Ably.Realtime.Promise({ authUrl: `/api/ably-token-request?clientId=${clientId}`, clientId });

  const spaces = new Spaces(ably);
  const space = spaces.get(getSpaceNameFromUrl(), { offlineTimeout: 60_000 });

  const name = getRandomName();
  const initialMembers = await space.enter({ name });

  space.on('membersUpdate', (members) => {
    renderAvatars(members);
  });

  renderSelfAvatar(name);
  renderAvatars(initialMembers);

  cursorTracking(ably);
})();
