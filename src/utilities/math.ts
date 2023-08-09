function clamp(num: number, min: number, max: number) {
  return Math.min(Math.max(num, min), max);
}

export { clamp };
