/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { Realtime } from 'ably/promises';
import { it, beforeEach, describe, expect, vi } from 'vitest';
import { waitFor, renderHook } from '@testing-library/react';
import { SpacesProvider } from './contexts/SpacesContext.js';
import { SpaceProvider } from './contexts/SpaceContext.js';
import Spaces from '../index.js';
import { useSpace } from './useSpace.js';

interface SpaceTestContext {
  spaces: Spaces;
}

vi.mock('ably/promises');
vi.mock('nanoid');

describe('useSpace', () => {
  beforeEach<SpaceTestContext>((context) => {
    const client = new Realtime({ key: 'spaces-test' });
    context.spaces = new Spaces(client);
  });

  it<SpaceTestContext>('creates and retrieves space successfully', async ({ spaces }) => {
    const spy = vi.spyOn(spaces, 'get');

    // @ts-ignore
    const { result } = renderHook(() => useSpace(), {
      wrapper: ({ children }) => (
        <SpacesProvider client={spaces}>
          <SpaceProvider name="spaces-test">{children}</SpaceProvider>
        </SpacesProvider>
      ),
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('spaces-test', undefined);

    const space = await spaces.get('spaces-test');

    await waitFor(() => {
      expect(result.current.space).toBe(space);
    });
  });
});
