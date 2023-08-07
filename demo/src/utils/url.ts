import { generate } from 'random-words';

const getSpaceNameFromUrl = () => {
  const url = new URL(window.location.href);
  const spaceNameInParams = url.searchParams.get('space');

  if (spaceNameInParams) {
    return spaceNameInParams;
  } else {
    const generatedName = generate({ exactly: 3, join: '-' });
    url.searchParams.set('space', generatedName);
    window.history.replaceState({}, '', `?${url.searchParams.toString()}`);
    return generatedName;
  }
};

export { getSpaceNameFromUrl };
