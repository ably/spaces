import { generate } from 'random-words';

const getParamNameFromUrl = (paramName = 'space', exactly = 3, join = '-' ) => {
  const url = new URL(window.location.href);
  const spaceNameInParams = url.searchParams.get(paramName);

  if (spaceNameInParams) {
    return spaceNameInParams;
  } else {
    const generatedName = generate({ exactly, join });
    url.searchParams.set(paramName, generatedName);
    window.history.replaceState({}, '', `?${url.searchParams.toString()}`);
    return generatedName;
  }
};

export { getParamNameFromUrl };
