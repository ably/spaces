import { queryDataId } from '../utils/dom';
import type { MemberColor } from '../utils/colors';

const cursorSvg = (startColor = '#06B6D4', endColor = '#3B82F6', id) => {
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

const createCursor = (connectionId: string, profileData: { name: string; color: MemberColor }): HTMLElement => {
  const container = document.createElement('div');
  container.id = `cursor-${connectionId}`;
  container.classList.add('absolute');

  const cursor = document.createElement('div');
  cursor.innerHTML = cursorSvg(profileData.color.gradientStart.hex, profileData.color.gradientEnd.hex, connectionId);

  const label = document.createElement('p');
  label.classList.add(
    'py-2',
    'px-4',
    'bg-gradient-to-b',
    profileData.color.gradientStart.tw,
    profileData.color.gradientEnd.tw,
    'rounded-full',
    'absolute',
    'text-white',
    'text-base',
    'truncate',
    'transition-all',
    'max-w-[120px]',
  );
  label.innerHTML = profileData.name.split(' ')[0];

  container.appendChild(cursor);
  container.appendChild(label);

  return container;
};

const attachCursors = (space, slideId) => {
  const slideContainer = document.querySelector('#slide-selected') as HTMLElement;
  const cursorContainer = queryDataId(slideContainer, 'slide-cursor-container');

  const cursor = space.cursors.get(slideId);
  const self = space.getSelf();

  cursor.on('cursorUpdate', (update) => {
    let cursorNode: HTMLElement = slideContainer.querySelector(`#cursor-${update.connectionId}`);
    const now = Date.now();
    const batchTime = space.cursors['cursorBatching']['batchTime'] * 3;
    const oldBatch = now - update.batchTimestamp > batchTime;

    if (oldBatch) {
      cursorNode ? cursorContainer.removeChild(cursorNode) : null;
      return;
    }

    const membersOnSlide = space.getMembers().filter((member) => member.location?.slide === slideId);
    const member = membersOnSlide.find((member) => member.connectionId === update.connectionId);

    if (!member || !self.connectionId || self.connectionId === update.connectionId) return;

    if (!(cursorNode instanceof HTMLElement)) {
      cursorNode = createCursor(update.connectionId, member.profileData);
      cursorContainer.appendChild(cursorNode);
    }

    if (update.data.state === 'leave') {
      cursorContainer.removeChild(cursorNode);
    } else {
      cursorNode.style.left = update.position.x + 'px';
      cursorNode.style.top = update.position.y + 'px';
    }
  });

  const cursorHandlers = {
    enter: (event) => {
      const { top, left } = cursorContainer.getBoundingClientRect();
      cursor.set({ position: { x: event.clientX - left, y: event.clientY - top }, data: { state: 'enter' } });
    },
    move: (event) => {
      const { top, left } = cursorContainer.getBoundingClientRect();
      cursor.set({ position: { x: event.clientX - left, y: event.clientY - top }, data: { state: 'move' } });
    },
    leave: (event) => {
      const { top, left } = cursorContainer.getBoundingClientRect();
      cursor.set({ position: { x: event.clientX - left, y: event.clientY - top }, data: { state: 'leave' } });
    },
  };

  slideContainer.addEventListener('mouseenter', cursorHandlers.enter);
  slideContainer.addEventListener('mousemove', cursorHandlers.move);
  slideContainer.addEventListener('mouseleave', cursorHandlers.leave);

  return () => {
    cursor.off();
    cursorContainer.innerHTML = '';
    slideContainer.removeEventListener('mouseenter', cursorHandlers.enter);
    slideContainer.removeEventListener('mousemove', cursorHandlers.move);
    slideContainer.removeEventListener('mouseleave', cursorHandlers.leave);
  };
};

export default attachCursors;
