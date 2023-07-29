import twColorSet from 'tailwindcss/colors';
import { DefaultColors } from 'tailwindcss/types/generated/colors';

const filteredTwSet = Object.keys(twColorSet)
  .filter(
    (colorName) =>
      !['gray', 'zinc', 'stone', 'slate', 'amber', 'neutral'].includes(colorName) &&
      typeof twColorSet[colorName as keyof DefaultColors] === 'object',
  )
  .map((colorName) => {
    return {
      colorName,
      intesity: Object.entries(twColorSet[colorName as keyof DefaultColors]).filter(
        ([key]) => !['50', '100', '900', '950'].includes(key),
      ),
    };
  });

type MemberColor = {
  name: string;
  gradientStart: { hex: string; tw: string; intensity: string };
  gradientEnd: { hex: string; tw: string; intensity: string };
};

const getRandomColor: () => MemberColor = () => {
  const colorOptions = filteredTwSet.length;
  const intesityOptions = filteredTwSet[0].intesity.length - 1;

  const colorIndex = Math.floor(Math.random() * colorOptions);
  const intensityIndex = Math.floor(Math.random() * intesityOptions);

  const color = filteredTwSet[colorIndex];
  const [startIntesity, startHex] = color.intesity[intensityIndex];
  const [endIntesity, endHex] = color.intesity[intensityIndex + 1];

  return {
    name: color.colorName,
    gradientStart: {
      intensity: startIntesity,
      hex: startHex as string,
      tw: `from-${color.colorName}-${startIntesity}`,
    },
    gradientEnd: {
      intensity: endIntesity,
      hex: endHex as string,
      tw: `to-${color.colorName}-${endIntesity}`,
    },
  };
};

export type { MemberColor };
export { getRandomColor };
