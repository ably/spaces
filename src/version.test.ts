import { describe, it, expect } from 'vitest';

import { VERSION } from './version.js';
import packageJson from '../package.json';

describe('VERSION', () => {
  it('runtime version matches package.json entry', () => {
    expect(packageJson.version).toEqual(VERSION);
  });
});
