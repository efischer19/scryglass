import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/* ------------------------------------------------------------------ */
/*  Module mocks — must be at top level                               */
/* ------------------------------------------------------------------ */

vi.mock('../image-cache', () => ({
  getCachedImage: vi.fn(),
  cacheImage: vi.fn(),
}));

vi.mock('../fetch-wrapper', () => ({
  fetchCardImage: vi.fn(),
}));

/* ------------------------------------------------------------------ */
/*  Imports (after mocks)                                             */
/* ------------------------------------------------------------------ */

import { _resetForTesting as resetWorker } from '../prefetch-worker';
import type {
  PrefetchCard,
  WorkerInboundMessage,
  WorkerOutboundMessage,
} from '../prefetch-worker';
import { getCachedImage, cacheImage } from '../image-cache';
import { fetchCardImage } from '../fetch-wrapper';
import {
  startPrefetch,
  pausePrefetch,
  resumePrefetch,
  stopPrefetch,
  _resetForTesting as resetCoordinator,
} from '../prefetch-coordinator';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const LIBRARY: PrefetchCard[] = [
  { collectorNumber: '161', setCode: 'lea' },
  { collectorNumber: '75', setCode: 'lea' },
  { collectorNumber: '67', setCode: 'lea' },
];

function outboundMessages(spy: ReturnType<typeof vi.fn>): WorkerOutboundMessage[] {
  return spy.mock.calls.map((call: unknown[]) => call[0] as WorkerOutboundMessage);
}

function fetchRequests(spy: ReturnType<typeof vi.fn>): WorkerOutboundMessage[] {
  return outboundMessages(spy).filter((m) => m.type === 'fetch-request');
}

/* ------------------------------------------------------------------ */
/*  Worker tests                                                      */
/* ------------------------------------------------------------------ */

describe('prefetch worker', () => {
  let postMessageSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    postMessageSpy = vi.fn();
    vi.stubGlobal('postMessage', postMessageSpy);
    resetWorker();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function send(msg: WorkerInboundMessage): void {
    const handler = self.onmessage;
    handler?.call(self, new MessageEvent('message', { data: msg }));
  }

  it('posts fetch-request messages in library order', async () => {
    send({ type: 'start', library: LIBRARY });

    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchRequests(postMessageSpy)).toHaveLength(1);
    expect(postMessageSpy).toHaveBeenCalledWith({
      type: 'fetch-request',
      card: LIBRARY[0],
    });

    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchRequests(postMessageSpy)).toHaveLength(2);
    expect(postMessageSpy).toHaveBeenCalledWith({
      type: 'fetch-request',
      card: LIBRARY[1],
    });

    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchRequests(postMessageSpy)).toHaveLength(3);
    expect(postMessageSpy).toHaveBeenCalledWith({
      type: 'fetch-request',
      card: LIBRARY[2],
    });
  });

  it('respects the 1-second delay between fetch-request messages', async () => {
    send({ type: 'start', library: LIBRARY });

    // At 999ms — nothing yet
    await vi.advanceTimersByTimeAsync(999);
    expect(postMessageSpy).not.toHaveBeenCalled();

    // At 1000ms — first fetch-request + progress
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchRequests(postMessageSpy)).toHaveLength(1);

    // At 1999ms — still only one fetch-request
    await vi.advanceTimersByTimeAsync(999);
    expect(fetchRequests(postMessageSpy)).toHaveLength(1);

    // At 2000ms — second fetch-request
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchRequests(postMessageSpy)).toHaveLength(2);
  });

  it('posts complete after processing all cards', async () => {
    send({ type: 'start', library: LIBRARY });

    await vi.advanceTimersByTimeAsync(3000);

    const messages = outboundMessages(postMessageSpy);
    const completeMessages = messages.filter((m) => m.type === 'complete');
    expect(completeMessages).toHaveLength(1);
  });

  it('posts progress messages with correct cached and total counts', async () => {
    send({ type: 'start', library: LIBRARY });

    await vi.advanceTimersByTimeAsync(1000);
    expect(postMessageSpy).toHaveBeenCalledWith({
      type: 'progress',
      cached: 1,
      total: 3,
    });

    await vi.advanceTimersByTimeAsync(1000);
    expect(postMessageSpy).toHaveBeenCalledWith({
      type: 'progress',
      cached: 2,
      total: 3,
    });

    await vi.advanceTimersByTimeAsync(1000);
    expect(postMessageSpy).toHaveBeenCalledWith({
      type: 'progress',
      cached: 3,
      total: 3,
    });
  });

  it('pause halts iteration; resume continues from where it left off', async () => {
    send({ type: 'start', library: LIBRARY });

    // Process first card
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchRequests(postMessageSpy)).toHaveLength(1);

    // Pause
    send({ type: 'pause' });

    // Advance well past the next tick — should remain at 1
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchRequests(postMessageSpy)).toHaveLength(1);

    // Resume
    send({ type: 'resume' });

    // Second card arrives after 1 second
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchRequests(postMessageSpy)).toHaveLength(2);
    expect(postMessageSpy).toHaveBeenCalledWith({
      type: 'fetch-request',
      card: LIBRARY[1],
    });
  });

  it('stop followed by a new start resets iteration to the new library', async () => {
    send({ type: 'start', library: LIBRARY });

    // Process first card
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchRequests(postMessageSpy)).toHaveLength(1);

    // Stop
    send({ type: 'stop' });

    // New library
    const newLibrary: PrefetchCard[] = [
      { collectorNumber: '1', setCode: 'lea' },
    ];

    send({ type: 'start', library: newLibrary });

    await vi.advanceTimersByTimeAsync(1000);
    expect(postMessageSpy).toHaveBeenCalledWith({
      type: 'fetch-request',
      card: newLibrary[0],
    });
  });
});

/* ------------------------------------------------------------------ */
/*  Coordinator tests                                                 */
/* ------------------------------------------------------------------ */

describe('prefetch coordinator', () => {
  let mockWorkerInstance: {
    onmessage: ((event: MessageEvent) => void) | null;
    postMessage: ReturnType<typeof vi.fn>;
    terminate: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCoordinator();

    mockWorkerInstance = {
      onmessage: null,
      postMessage: vi.fn(),
      terminate: vi.fn(),
    };

    vi.stubGlobal(
      'Worker',
      class {
        onmessage: ((event: MessageEvent) => void) | null = null;
        postMessage = vi.fn();
        terminate = vi.fn();

        constructor() {
          // Expose the instance for test assertions
          mockWorkerInstance.postMessage = this.postMessage;
          mockWorkerInstance.terminate = this.terminate;
          // Proxy onmessage so we can trigger it from tests
          Object.defineProperty(this, 'onmessage', {
            get: () => mockWorkerInstance.onmessage,
            set: (fn: ((event: MessageEvent) => void) | null) => {
              mockWorkerInstance.onmessage = fn;
            },
          });
        }
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function simulateWorkerMessage(msg: WorkerOutboundMessage): void {
    mockWorkerInstance.onmessage?.(
      new MessageEvent('message', { data: msg }),
    );
  }

  it('skips already-cached images (does not call fetchCardImage)', async () => {
    const blob = new Blob(['cached'], { type: 'image/jpeg' });
    vi.mocked(getCachedImage).mockResolvedValue(blob);

    const card: PrefetchCard = { collectorNumber: '161', setCode: 'lea' };
    startPrefetch([card]);

    // Simulate worker sending a fetch-request
    simulateWorkerMessage({ type: 'fetch-request', card });

    // Let the async handler settle
    await vi.waitFor(() => {
      expect(getCachedImage).toHaveBeenCalledWith('161', 'lea');
    });

    expect(fetchCardImage).not.toHaveBeenCalled();
    expect(cacheImage).not.toHaveBeenCalled();

    stopPrefetch();
  });

  it('fetches and caches uncached images', async () => {
    vi.mocked(getCachedImage).mockResolvedValue(null);
    const blob = new Blob(['image-data'], { type: 'image/jpeg' });
    vi.mocked(fetchCardImage).mockResolvedValue(blob);
    vi.mocked(cacheImage).mockResolvedValue(undefined);

    const card: PrefetchCard = { collectorNumber: '75', setCode: 'lea' };
    startPrefetch([card]);

    simulateWorkerMessage({ type: 'fetch-request', card });

    await vi.waitFor(() => {
      expect(fetchCardImage).toHaveBeenCalledWith({
        setCode: 'lea',
        collectorNumber: '75',
      });
    });

    await vi.waitFor(() => {
      expect(cacheImage).toHaveBeenCalledWith('75', 'lea', blob);
    });

    stopPrefetch();
  });

  it('sends start message to worker with the library', () => {
    const library: PrefetchCard[] = [
      { collectorNumber: '161', setCode: 'lea' },
    ];

    startPrefetch(library);

    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith({
      type: 'start',
      library,
    });

    stopPrefetch();
  });

  it('sends pause and resume messages to worker', () => {
    startPrefetch([]);

    pausePrefetch();
    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith({
      type: 'pause',
    });

    resumePrefetch();
    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith({
      type: 'resume',
    });

    stopPrefetch();
  });

  it('sends stop message and terminates the worker', () => {
    startPrefetch([]);

    stopPrefetch();

    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith({
      type: 'stop',
    });
    expect(mockWorkerInstance.terminate).toHaveBeenCalled();
  });
});
