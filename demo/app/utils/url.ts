import randomWords from 'random-words';

const getSpaceNameFromUrl = () => {
  const url = new URL(location.href);
  const spaceNameInParams = url.searchParams.get('space');

  if (spaceNameInParams) {
    return spaceNameInParams;
  } else {
    const generatedName = randomWords({ exactly: 3, join: '-' });
    url.searchParams.set('space', generatedName);
    history.replaceState({}, '', `?${url.searchParams.toString()}`);
    return generatedName;
  }
};

export { getSpaceNameFromUrl };
