/** Background prefetch worker — schedules image fetch requests per ADR-003. */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface PrefetchCard {
  collectorNumber: string;
  setCode: string;
}

export type WorkerInboundMessage =
  | { type: 'start'; library: PrefetchCard[] }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'stop' };

export type WorkerOutboundMessage =
  | { type: 'fetch-request'; card: PrefetchCard }
  | { type: 'progress'; cached: number; total: number }
  | { type: 'complete' };

/* ------------------------------------------------------------------ */
/*  Worker state                                                      */
/* ------------------------------------------------------------------ */

let library: PrefetchCard[] = [];
let currentIndex = 0;
let timerId: ReturnType<typeof setTimeout> | null = null;
let paused = false;

/* ------------------------------------------------------------------ */
/*  Scheduler                                                         */
/* ------------------------------------------------------------------ */

function scheduleNext(): void {
  if (paused || currentIndex >= library.length) {
    if (currentIndex >= library.length && library.length > 0) {
      self.postMessage({ type: 'complete' });
    }
    return;
  }

  timerId = setTimeout(() => {
    const card = library[currentIndex]!;
    self.postMessage({ type: 'fetch-request', card });
    self.postMessage({
      type: 'progress',
      cached: currentIndex + 1,
      total: library.length,
    });
    currentIndex++;
    scheduleNext();
  }, 1000);
}

/* ------------------------------------------------------------------ */
/*  Message handler                                                   */
/* ------------------------------------------------------------------ */

self.onmessage = (event: MessageEvent) => {
  const msg = event.data as WorkerInboundMessage;
  switch (msg.type) {
    case 'start':
      if (timerId !== null) clearTimeout(timerId);
      library = msg.library;
      currentIndex = 0;
      paused = false;
      scheduleNext();
      break;
    case 'pause':
      paused = true;
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
      break;
    case 'resume':
      if (paused) {
        paused = false;
        scheduleNext();
      }
      break;
    case 'stop':
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
      library = [];
      currentIndex = 0;
      paused = false;
      break;
  }
};

/** Reset internal state — only for use in tests. */
export function _resetForTesting(): void {
  if (timerId !== null) clearTimeout(timerId);
  library = [];
  currentIndex = 0;
  timerId = null;
  paused = false;
}
