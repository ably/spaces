import { generate } from 'random-words';

const getParamNameFromUrl = (paramName: string = 'space', length = 3, join = '-' ) => {
  const url = new URL(window.location.href);
  const spaceNameInParams = url.searchParams.get(paramName);

  if (spaceNameInParams) {
    return spaceNameInParams;
  } else {
    const generatedName = generate({ exactly: length, join });
    url.searchParams.set(paramName, generatedName);
    window.history.replaceState({}, '', `?${url.searchParams.toString()}`);
    return generatedName;
  }
};

export { getParamNameFromUrl };
