/** Preact hook for JIT card image fetching per ADR-003. */

import { useEffect, useState } from 'preact/hooks';
import { priorityFetch } from './jit-priority';
import type { CardImageState } from './jit-priority';

export type { CardImageState } from './jit-priority';

export function useCardImage(cardName: string, setCode: string): CardImageState {
  const [state, setState] = useState<CardImageState>({
    status: 'loading',
    imageUrl: null,
    cardName,
  });

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setState({ status: 'loading', imageUrl: null, cardName });

    priorityFetch(cardName, setCode).then((url) => {
      if (cancelled) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      if (url) {
        objectUrl = url;
        setState({ status: 'loaded', imageUrl: url, cardName });
      } else {
        setState({ status: 'error', imageUrl: null, cardName });
      }
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [cardName, setCode]);

  return state;
}
