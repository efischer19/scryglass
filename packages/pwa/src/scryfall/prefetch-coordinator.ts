/** Main-thread coordinator for background image prefetch per ADR-003. */

import type {
  PrefetchCard,
  WorkerInboundMessage,
  WorkerOutboundMessage,
} from './prefetch-worker';
import { getCachedImage, cacheImage } from './image-cache';
import { fetchCardImage } from './fetch-wrapper';

export type { PrefetchCard };

/* ------------------------------------------------------------------ */
/*  Worker instance                                                   */
/* ------------------------------------------------------------------ */

let worker: Worker | null = null;

/* ------------------------------------------------------------------ */
/*  Message handling                                                  */
/* ------------------------------------------------------------------ */

async function handleFetchRequest(card: PrefetchCard): Promise<void> {
  const cached = await getCachedImage(card.collectorNumber, card.setCode);
  if (cached) return;

  const blob = await fetchCardImage({
    setCode: card.setCode,
    collectorNumber: card.collectorNumber,
  });
  if (blob) {
    await cacheImage(card.collectorNumber, card.setCode, blob);
  }
}

function handleMessage(event: MessageEvent<WorkerOutboundMessage>): void {
  const msg = event.data;
  switch (msg.type) {
    case 'fetch-request':
      void handleFetchRequest(msg.card);
      break;
    case 'progress':
      // Optional: UI status updates can be wired here
      break;
    case 'complete':
      // Optional: signal that prefetch is done
      break;
  }
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

export function startPrefetch(library: PrefetchCard[]): void {
  stopPrefetch();

  worker = new Worker(
    new URL('./prefetch-worker.ts', import.meta.url),
    { type: 'module' },
  );
  worker.onmessage = handleMessage;

  const msg: WorkerInboundMessage = { type: 'start', library };
  worker.postMessage(msg);
}

export function pausePrefetch(): void {
  if (!worker) return;
  const msg: WorkerInboundMessage = { type: 'pause' };
  worker.postMessage(msg);
}

export function resumePrefetch(): void {
  if (!worker) return;
  const msg: WorkerInboundMessage = { type: 'resume' };
  worker.postMessage(msg);
}

export function stopPrefetch(): void {
  if (!worker) return;
  const msg: WorkerInboundMessage = { type: 'stop' };
  worker.postMessage(msg);
  worker.terminate();
  worker = null;
}

/** Reset internal state — only for use in tests. */
export function _resetForTesting(): void {
  worker = null;
}
