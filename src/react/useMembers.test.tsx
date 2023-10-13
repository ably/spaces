/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { Realtime } from 'ably/promises';
import { it, beforeEach, describe, expect, vi } from 'vitest';
import { waitFor, renderHook } from '@testing-library/react';
import { SpacesProvider } from './contexts/SpacesContext.js';
import { SpaceProvider } from './contexts/SpaceContext.js';
import type { Types } from 'ably';
import Spaces from '../index.js';
import { useMembers } from './useMembers.js';
import { createPresenceEvent } from '../utilities/test/fakes.js';
import Space from '../Space.js';

interface SpaceTestContext {
  spaces: Spaces;
  space: Space;
  presenceMap: Map<string, Types.PresenceMessage>;
}

vi.mock('ably/promises');
vi.mock('nanoid');

describe('useMembers', () => {
  beforeEach<SpaceTestContext>((context) => {
    const client = new Realtime({ key: 'spaces-test' });
    context.spaces = new Spaces(client);
    context.presenceMap = new Map();

    const space = new Space('test', client);
    const presence = space.channel.presence;

    context.space = space;

    vi.spyOn(context.spaces, 'get').mockImplementation(async () => space);

    vi.spyOn(presence, 'get').mockImplementation(async () => {
      return Array.from(context.presenceMap.values());
    });
  });

  it<SpaceTestContext>('invokes callback with enter and update on enter presence events', async ({
    space,
    spaces,
    presenceMap,
  }) => {
    const callbackSpy = vi.fn();
    // @ts-ignore
    const { result } = renderHook(() => useMembers(['enter', 'update'], callbackSpy), {
      wrapper: ({ children }) => (
        <SpacesProvider client={spaces}>
          <SpaceProvider name="spaces-test">{children}</SpaceProvider>
        </SpacesProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.space).toBe(space);
    });

    await createPresenceEvent(space, presenceMap, 'enter');
    const member = await space.members.getSelf();

    await waitFor(() => {
      // one for update, one for enter
      expect(callbackSpy).toHaveBeenCalledTimes(2);
      expect(result.current.members).toEqual([member]);
      expect(result.current.others).toEqual([]);
      expect(result.current.self).toEqual(member);
    });
  });

  it<SpaceTestContext>('skips callback if skip option provided', async ({ space, spaces, presenceMap }) => {
    const callbackSpy = vi.fn();
    // @ts-ignore
    const { result } = renderHook(() => useMembers(callbackSpy, { skip: true }), {
      wrapper: ({ children }) => (
        <SpacesProvider client={spaces}>
          <SpaceProvider name="spaces-test">{children}</SpaceProvider>
        </SpacesProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.space).toBe(space);
    });

    await createPresenceEvent(space, presenceMap, 'enter');
    const member = await space.members.getSelf();

    await waitFor(() => {
      expect(result.current.members).toEqual([member]);
      expect(result.current.others).toEqual([]);
      expect(result.current.self).toEqual(member);
      expect(callbackSpy).toHaveBeenCalledTimes(0);
    });
  });
});
