import { colors } from '../utils/colors';
import { HTMLElementManager } from './location-change-handlers';

const slideSelectedClasses = [
  'outline-2',
  'outline',
  `before:content-[attr(data-before)]`,
  'before:absolute',
  'before:-top-[22px]',
  'before:-left-[2px]',
  'before:px-[10px]',
  'before:text-sm',
  'before:text-white',
  'before:rounded-t-lg',
  'before:normal-case',
];

const selectSlideElement = (
  htmlElement: HTMLElement,
  userName: string,
  newClientId: string,
  selfId: string,
  memberIndex: number,
) => {
  htmlElement.setAttribute(`data-client-${newClientId}`, 'true');

  const allPresent = htmlElement.getAttribute('data-all-present');
  htmlElement.setAttribute('data-all-present', `${allPresent ? `${allPresent} ` : ''}${userName}`);

  if (!htmlElement.getAttribute('data-before')) {
    htmlElement.setAttribute('data-before', userName);
  }

  if (newClientId === selfId) {
    htmlElement.classList.add(...slideSelectedClasses, 'outline-blue-400', 'before:bg-blue-400');
    return;
  }

  const color = colors[memberIndex % colors.length];
  const cssColor = `${color[0]}-${color[1]}`;
  const outlineColor = `outline-${cssColor}`;
  htmlElement.classList.add(...slideSelectedClasses, outlineColor, `before:bg-${cssColor}`);
};

const deselectSlideElement = (
  htmlElement: HTMLElement,
  userName: string,
  oldClientId: string,
  selfId: string,
  memberIndex: number,
) => {
  htmlElement.removeAttribute(`data-client-${oldClientId}`);

  htmlElement.removeAttribute('data-before');

  const allPresent = htmlElement.getAttribute('data-all-present');
  const allPresentList = allPresent ? allPresent.split(/\s/) : [];
  if (allPresentList.length <= 1) {
    htmlElement.removeAttribute('data-all-present');
  } else {
    const filteredAllPresent = allPresentList.filter((name) => name !== userName);
    htmlElement.setAttribute('data-before', filteredAllPresent[0]);
    htmlElement.setAttribute('data-all-present', filteredAllPresent.join(' '));
  }

  const classesToRemove =
    htmlElement.getAttributeNames().filter((name) => name.startsWith('data-client-')).length > 0
      ? []
      : slideSelectedClasses;

  if (oldClientId === selfId) {
    htmlElement.classList.remove(...classesToRemove, 'outline-blue-400', 'before:bg-blue-400');
    return;
  }
  const color = colors[memberIndex % colors.length];
  const cssColor = `${color[0]}-${color[1]}`;
  const outlineColor = `outline-${cssColor}`;

  htmlElement.classList.remove(...classesToRemove, outlineColor, `before:bg-${cssColor}`);
};

const slideElementManager: HTMLElementManager = {
  selector: selectSlideElement,
  deselector: deselectSlideElement,
};

export { slideElementManager };
