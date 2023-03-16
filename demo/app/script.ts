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

const createOrUpdateCursor = ({ x, y, connectionId }, members, cursorsContainer) => {
  const node = members[connectionId];

  if (node) {
    node.style.top = `${y}px`;
    node.style.left = `${x}px`;
  } else {
    const userCursor = document.createElement('span');
    userCursor.innerHTML = cursorSVG;
    userCursor.style.position = 'fixed';
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
  let lastMessageTime = 0;

  setInterval(() => {
    console.log('Messages received: ', receivedMsgCounter);
    console.log('Messages published: ', publishedMsgCounter);
    receivedMsgCounter = 0;
    publishedMsgCounter = 0;
  }, 1000);

  window.addEventListener(
    'mousemove',
    throttle(({ clientX, clientY }) => {
      publishedMsgCounter++;
      cursorChannel.publish('update', { x: clientX, y: clientY, connectionId });
    }, 0)
  );

  cursorChannel.subscribe((message) => {
    if (connectionId === message.data.connectionId) return;
    createOrUpdateCursor(message.data, members, cursorsContainer);
    receivedMsgCounter++;
    const diff = message.timestamp - lastMessageTime;
    lastMessageTime = message.timestamp;

    // console.log({ diff, lastMessageTime });
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
