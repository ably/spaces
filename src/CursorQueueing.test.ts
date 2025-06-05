import { it, describe, expect, vi, beforeEach } from 'vitest';
import { Realtime, RealtimeClient, RealtimeChannel } from 'ably';
import Space from './Space.js';
import CursorBatching from './CursorBatching.js';
import { CURSOR_UPDATE } from './CursorConstants.js';

interface CursorQueueingTestContext {
  client: RealtimeClient;
  space: Space;
  channel: RealtimeChannel;
  batching: CursorBatching;
}

vi.mock('ably');

describe('Cursor Queuing Bug Fix', () => {
  beforeEach<CursorQueueingTestContext>((context) => {
    const client = new Realtime({});
    // Mock the connection object that Space expects
    (client as any).connection = { id: 'test-connection-id' };

    context.client = client;
    context.space = new Space('test', client);

    // Set up cursor channel by subscribing
    context.space.cursors.subscribe('update', () => {});
    context.channel = context.space.cursors.channel!;
    context.batching = context.space.cursors['cursorBatching'];

    // Mock channel methods
    vi.spyOn(context.channel, 'publish');
  });

  it<CursorQueueingTestContext>('BUG FIX: cursor positions set before channel ready should be queued and sent when ready', async ({
    space,
    batching,
    channel,
  }) => {
    // Mock the self member (required for cursor.set())
    vi.spyOn(space.members, 'getSelf').mockResolvedValue({
      connectionId: 'test-connection',
      clientId: 'test-client',
      isConnected: true,
      profileData: {},
      location: null,
      lastEvent: { name: 'enter', timestamp: 1 },
    });

    // Get the publish spy
    const publishSpy = vi.spyOn(channel, 'publish');

    // Start with shouldSend false (channel not ready)
    batching.setShouldSend(false);

    // Client sets cursor position before channel is ready
    await space.cursors.set({ position: { x: 100, y: 200 }, data: { color: 'blue' } });

    // Position should NOT be published immediately
    expect(publishSpy).not.toHaveBeenCalled();

    // Verify position is in pending buffer
    expect(batching.pendingBuffer.length).toBe(1);
    expect(batching.pendingBuffer[0].cursor.position).toEqual({ x: 100, y: 200 });

    // Simulate channel becoming ready
    batching.setShouldSend(true);

    // Trigger publish of pending items
    batching.triggerPublishFromPending(channel);

    // The queued cursor position should now be published
    expect(publishSpy).toHaveBeenCalledWith(CURSOR_UPDATE, [
      expect.objectContaining({
        cursor: { position: { x: 100, y: 200 }, data: { color: 'blue' } },
      }),
    ]);

    // Pending buffer should be cleared
    expect(batching.pendingBuffer.length).toBe(0);
  });

  it<CursorQueueingTestContext>('multiple pending cursor positions are preserved and sent in order', async ({
    batching,
    channel,
  }) => {
    const publishSpy = vi.spyOn(channel, 'publish');

    // Start with shouldSend false
    batching.setShouldSend(false);

    // Add multiple cursor positions to pending buffer
    batching.pushCursorPosition(channel, { position: { x: 10, y: 20 }, data: { color: 'red' } });
    batching.pushCursorPosition(channel, { position: { x: 30, y: 40 }, data: { color: 'green' } });
    batching.pushCursorPosition(channel, { position: { x: 50, y: 60 }, data: { color: 'blue' } });

    // Verify all positions are queued
    expect(batching.pendingBuffer.length).toBe(3);
    expect(publishSpy).not.toHaveBeenCalled();

    // Set shouldSend to true (this should process pending items)
    batching.setShouldSend(true);

    // Trigger publish of pending items
    batching.triggerPublishFromPending(channel);

    // All pending items should be moved to outgoing buffer and published
    expect(batching.pendingBuffer.length).toBe(0);
    expect(publishSpy).toHaveBeenCalled();
  });

  it<CursorQueueingTestContext>('cursor positions set after shouldSend is true are published immediately', async ({
    batching,
    channel,
  }) => {
    const publishSpy = vi.spyOn(channel, 'publish');

    // Start with shouldSend true
    batching.setShouldSend(true);

    // Add cursor position (should be published immediately)
    batching.pushCursorPosition(channel, { position: { x: 100, y: 200 }, data: { color: 'yellow' } });

    // Should be published immediately, not queued
    expect(batching.pendingBuffer.length).toBe(0);
    expect(publishSpy).toHaveBeenCalled();
  });

  it<CursorQueueingTestContext>('setShouldSend(true) processes existing pending items', ({ batching, channel }) => {
    // Add items to pending buffer while shouldSend is false
    batching.setShouldSend(false);
    batching.pushCursorPosition(channel, { position: { x: 1, y: 2 }, data: {} });
    batching.pushCursorPosition(channel, { position: { x: 3, y: 4 }, data: {} });

    expect(batching.pendingBuffer.length).toBe(2);

    // Setting shouldSend to true should process pending items
    batching.setShouldSend(true);

    expect(batching.pendingBuffer.length).toBe(0);
  });
});
