/** Preact hook for fetching commander art_crop images per ADR-003. */

import { useEffect, useState } from 'preact/hooks';
import { priorityFetchArtCrop } from './jit-priority';

export interface CommanderAvatarState {
  status: 'loading' | 'loaded' | 'error';
  imageUrl: string | null;
  collectorNumber: string;
}

export function useCommanderAvatar(
  collectorNumber: string,
  setCode: string,
): CommanderAvatarState {
  const [state, setState] = useState<CommanderAvatarState>({
    status: 'loading',
    imageUrl: null,
    collectorNumber,
  });

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setState({ status: 'loading', imageUrl: null, collectorNumber });

    priorityFetchArtCrop(collectorNumber, setCode).then((url) => {
      if (cancelled) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      if (url) {
        objectUrl = url;
        setState({ status: 'loaded', imageUrl: url, collectorNumber });
      } else {
        setState({ status: 'error', imageUrl: null, collectorNumber });
      }
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [collectorNumber, setCode]);

  return state;
}
