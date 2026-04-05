import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchCardImage,
  getQueueLength,
  _resetForTesting,
} from '../fetch-wrapper';
import type { FetchCardImageParams } from '../fetch-wrapper';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_PARAMS: FetchCardImageParams = {
  setCode: 'lea',
  collectorNumber: '141',
};

function mockCardJson(imageUrl = 'https://cards.scryfall.io/normal/test.jpg') {
  return {
    image_uris: { normal: imageUrl },
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function blobResponse(): Response {
  return new Response(new Blob(['image-data'], { type: 'image/jpeg' }), {
    status: 200,
  });
}

function errorResponse(status: number): Response {
  return new Response(null, { status });
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('fetchCardImage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn());
    _resetForTesting();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns a Blob on successful fetch', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(jsonResponse(mockCardJson()))
      .mockResolvedValueOnce(blobResponse());

    const promise = fetchCardImage(DEFAULT_PARAMS);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBeInstanceOf(Blob);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]![0]).toContain(
      'api.scryfall.com/cards/',
    );
    expect(fetchMock.mock.calls[0]![1]).toEqual(
      expect.objectContaining({
        headers: {
          'User-Agent':
            'Scryglass/0.1 (+https://github.com/efischer19/scryglass)',
        },
      }),
    );
  });

  it('returns null for HTTP 404 without retrying', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(errorResponse(404));

    const promise = fetchCardImage(DEFAULT_PARAMS);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries with exponential backoff on HTTP 429', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(errorResponse(429))
      .mockResolvedValueOnce(jsonResponse(mockCardJson()))
      .mockResolvedValueOnce(blobResponse());

    const promise = fetchCardImage(DEFAULT_PARAMS);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBeInstanceOf(Blob);
    // 429 → card json → image blob
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries with exponential backoff on HTTP 5xx', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(errorResponse(503))
      .mockResolvedValueOnce(jsonResponse(mockCardJson()))
      .mockResolvedValueOnce(blobResponse());

    const promise = fetchCardImage(DEFAULT_PARAMS);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBeInstanceOf(Blob);
    // 500 → 503 → card json → image blob
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('processes multiple concurrent calls sequentially with ≥100ms gaps', async () => {
    const callTimestamps: number[] = [];
    const fetchMock = vi.mocked(fetch);

    // Record timestamps for every fetch call, returning appropriate responses
    fetchMock.mockImplementation(async (_input) => {
      callTimestamps.push(Date.now());
      const idx = callTimestamps.length - 1;
      // Even calls (0, 2) are card JSON; odd calls (1, 3) are image blobs
      if (idx % 2 === 0) {
        return jsonResponse(mockCardJson());
      }
      return blobResponse();
    });

    const p1 = fetchCardImage({ setCode: 'set1', collectorNumber: '1' });
    const p2 = fetchCardImage({ setCode: 'set2', collectorNumber: '2' });

    await vi.runAllTimersAsync();
    await Promise.all([p1, p2]);

    // 4 fetch calls total (2 per card)
    expect(fetchMock).toHaveBeenCalledTimes(4);

    // Each successive call should be ≥100ms after the previous
    for (let i = 1; i < callTimestamps.length; i++) {
      expect(
        callTimestamps[i]! - callTimestamps[i - 1]!,
      ).toBeGreaterThanOrEqual(100);
    }
  });

  it('getQueueLength reflects the number of pending requests', async () => {
    const fetchMock = vi.mocked(fetch);

    // Deferred promise to hold the first fetch in-flight
    let resolveFirst: (value: Response) => void = () => {};
    const firstPromise = new Promise<Response>((r) => {
      resolveFirst = r;
    });

    // Set up mocks for both requests upfront:
    // 1st fetch → deferred (card A), 2nd fetch → 404 (card B)
    fetchMock
      .mockReturnValueOnce(firstPromise)
      .mockResolvedValueOnce(errorResponse(404));

    // Queue two requests
    const p1 = fetchCardImage({ setCode: 'set1', collectorNumber: '1' });
    const p2 = fetchCardImage({ setCode: 'set2', collectorNumber: '2' });

    // Advance past rate-limit delay so the first fetch starts
    await vi.advanceTimersByTimeAsync(150);

    // Both entries still in queue (first is in-flight, second is waiting)
    expect(getQueueLength()).toBe(2);

    // Resolve the first request as 404
    resolveFirst(errorResponse(404));
    await vi.runAllTimersAsync();

    await Promise.all([p1, p2]);
    expect(getQueueLength()).toBe(0);
  });
});
