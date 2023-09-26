import { generate } from 'random-words';

const getParamValueFromUrl = (param: string, generateDefault: () => string): string => {
  const url = new URL(window.location.href);
  const value = url.searchParams.get(param);

  if (!value) {
    const generatedValue = generateDefault();
    url.searchParams.set(param, generatedValue);
    window.history.replaceState({}, '', `?${url.searchParams.toString()}`);

    return generatedValue;
  }

  return value;
};

const generateSpaceName = () => {
  return generate({ exactly: 3, join: '-' });
};

const generateTeamName = () => {
  return generate({ exactly: 1, join: '' });
};

export { getParamValueFromUrl, generateSpaceName, generateTeamName };
