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
import Space from '../Space.js';
import { createPresenceEvent } from '../utilities/test/fakes.js';
import { useCursors } from './useCursors.js';
import type { Types } from 'ably';

interface SpaceTestContext {
  spaces: Spaces;
  space: Space;
  presenceMap: Map<string, Types.PresenceMessage>;
}

vi.mock('ably/promises');
vi.mock('nanoid');

describe('useCursors', () => {
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

  it<SpaceTestContext>('invokes callback on cursor set', async ({ space, spaces, presenceMap }) => {
    const callbackSpy = vi.fn();
    // @ts-ignore
    const { result } = renderHook(() => useCursors(callbackSpy), {
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

    const dispensing = space.cursors.cursorDispensing;

    const fakeMessage = {
      connectionId: '1',
      clientId: '1',
      encoding: 'encoding',
      extras: null,
      id: '1',
      name: 'fake',
      timestamp: 1,
      data: [{ cursor: { position: { x: 1, y: 1 } } }],
    };

    dispensing.processBatch(fakeMessage);

    await waitFor(() => {
      expect(callbackSpy).toHaveBeenCalledWith({
        position: { x: 1, y: 1 },
        data: undefined,
        clientId: '1',
        connectionId: '1',
      });
    });
  });

  it<SpaceTestContext>('returns cursors', async ({ space, spaces, presenceMap }) => {
    // @ts-ignore
    const { result } = renderHook(() => useCursors({ returnCursors: true }), {
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
    await createPresenceEvent(space, presenceMap, 'enter', { clientId: '2', connectionId: '2' });
    const [member] = await space.members.getOthers();

    const dispensing = space.cursors.cursorDispensing;

    const fakeMessage = {
      connectionId: '2',
      clientId: '2',
      encoding: 'encoding',
      extras: null,
      id: '1',
      name: 'fake',
      timestamp: 1,
      data: [{ cursor: { position: { x: 1, y: 1 } } }],
    };

    dispensing.processBatch(fakeMessage);

    await waitFor(() => {
      expect(result.current.cursors).toEqual({
        '2': { member, cursorUpdate: { clientId: '2', connectionId: '2', position: { x: 1, y: 1 } } },
      });
    });
  });
});
