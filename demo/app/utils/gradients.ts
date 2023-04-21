import { colors } from './colors';

const gradients = colors.map(([color, intensity]) => [`from-${color}-${intensity}`, `to-${color}-${intensity + 100}`]);

export { gradients };
