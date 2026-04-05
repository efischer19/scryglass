/** Rate-limited Scryfall API fetch wrapper per ADR-003. */

export interface FetchCardImageParams {
  cardName: string;
  setCode: string;
}

export type FetchCardImageResult = Blob | null;

interface QueueEntry {
  params: FetchCardImageParams;
  resolve: (value: FetchCardImageResult) => void;
  reject: (reason: unknown) => void;
}

const USER_AGENT = 'Scryglass/0.1 (+https://github.com/efischer19/scryglass)';
const MIN_INTERVAL_MS = 100;
const MAX_BACKOFF_MS = 32_000;
const INITIAL_BACKOFF_MS = 1_000;

const queue: QueueEntry[] = [];
let lastRequestTime = 0;
let processing = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await sleep(MIN_INTERVAL_MS - elapsed);
  }
  lastRequestTime = Date.now();
  return fetch(url, { headers: { 'User-Agent': USER_AGENT } });
}

async function fetchWithBackoff(url: string): Promise<Response> {
  let backoff = INITIAL_BACKOFF_MS;

  for (;;) {
    const response = await rateLimitedFetch(url);

    if (response.status === 429 || response.status >= 500) {
      if (backoff >= MAX_BACKOFF_MS) {
        return response;
      }
      await sleep(backoff);
      backoff *= 2;
      continue;
    }

    return response;
  }
}

async function processQueue(): Promise<void> {
  if (processing) return;
  processing = true;

  while (queue.length > 0) {
    const entry = queue[0]!;
    try {
      const result = await executeFetch(entry.params);
      queue.shift();
      entry.resolve(result);
    } catch (error: unknown) {
      queue.shift();
      entry.reject(error);
    }
  }

  processing = false;
}

async function executeFetch(
  params: FetchCardImageParams,
): Promise<FetchCardImageResult> {
  const cardUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(params.cardName)}&set=${encodeURIComponent(params.setCode)}`;
  const cardResponse = await fetchWithBackoff(cardUrl);

  if (cardResponse.status === 404) {
    return null;
  }

  if (!cardResponse.ok) {
    throw new Error(`Scryfall API error: ${String(cardResponse.status)}`);
  }

  const cardData = (await cardResponse.json()) as {
    image_uris?: { normal?: string };
  };

  const imageUrl = cardData.image_uris?.normal;
  if (!imageUrl) {
    throw new Error('No image_uris.normal in Scryfall response');
  }

  const imageResponse = await fetchWithBackoff(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Image fetch error: ${String(imageResponse.status)}`);
  }

  return imageResponse.blob();
}

export function fetchCardImage(
  params: FetchCardImageParams,
): Promise<FetchCardImageResult> {
  return new Promise<FetchCardImageResult>((resolve, reject) => {
    queue.push({ params, resolve, reject });
    void processQueue();
  });
}

export function getQueueLength(): number {
  return queue.length;
}

/** Reset internal state — only for use in tests. */
export function _resetForTesting(): void {
  queue.length = 0;
  lastRequestTime = 0;
  processing = false;
}
