import { colors } from './colors';

export const gradients = colors.map(([color, intensity]) => [
  `from-${color}-${intensity}`,
  `to-${color}-${intensity + 100}`,
]);
