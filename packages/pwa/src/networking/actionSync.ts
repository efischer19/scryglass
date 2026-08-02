import type { Action, ActionResult, GameState } from '@scryglass/core';

export interface RemoteActionEnvelope {
  kind: 'action';
  action: Action;
  sentAt: number;
  sequence: number;
}

interface CreateActionSyncMiddlewareOptions {
  dispatch: (state: GameState, action: Action) => ActionResult;
  getState: () => GameState;
  setState: (state: GameState) => void;
  broadcast?: (message: string) => void;
  onResult?: (action: Action, result: ActionResult, source: 'local' | 'remote') => void;
  now?: () => number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function getConflictKey(action: Action): string | null {
  switch (action.type) {
    case 'MOVE_CARD':
    case 'CHANGE_CARD_STATE':
      return `${action.payload.player}:${action.payload.cardName}`;
    case 'RETURN_TO_LIBRARY':
      return `${action.payload.player}:${action.payload.card.name}`;
    default:
      return null;
  }
}

export function parseRemoteActionEnvelope(message: string): RemoteActionEnvelope | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(message);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) {
    return null;
  }

  const { kind, action, sentAt, sequence } = parsed;
  if (kind !== 'action' || !isRecord(action) || typeof sentAt !== 'number' || !Number.isFinite(sentAt)) {
    return null;
  }

  if (typeof sequence !== 'number' || !Number.isInteger(sequence) || sequence < 0) {
    return null;
  }

  return {
    kind,
    action: action as Action,
    sentAt,
    sequence,
  };
}

export function createActionSyncMiddleware(options: CreateActionSyncMiddlewareOptions) {
  const latestConflictTimestamps = new Map<string, number>();
  let nextSequence = 0;
  const now = options.now ?? (() => Date.now());

  function noteConflictTimestamp(action: Action, sentAt: number): void {
    const key = getConflictKey(action);
    if (key) {
      latestConflictTimestamps.set(key, sentAt);
    }
  }

  function applyAction(action: Action, sentAt: number, source: 'local' | 'remote'): ActionResult {
    const result = options.dispatch(options.getState(), action);
    noteConflictTimestamp(action, sentAt);
    options.setState(result.state);
    options.onResult?.(action, result, source);
    return result;
  }

  return {
    dispatchLocal(action: Action): ActionResult {
      const envelope: RemoteActionEnvelope = {
        kind: 'action',
        action,
        sentAt: now(),
        sequence: nextSequence,
      };
      nextSequence += 1;

      const result = applyAction(action, envelope.sentAt, 'local');
      options.broadcast?.(JSON.stringify(envelope));
      return result;
    },

    handleIncomingMessage(message: string): ActionResult | null {
      const envelope = parseRemoteActionEnvelope(message);
      if (!envelope) {
        return null;
      }

      const conflictKey = getConflictKey(envelope.action);
      const latestTimestamp = conflictKey == null
        ? undefined
        : latestConflictTimestamps.get(conflictKey);

      if (latestTimestamp !== undefined && envelope.sentAt < latestTimestamp) {
        return null;
      }

      return applyAction(envelope.action, envelope.sentAt, 'remote');
    },

    reset(): void {
      latestConflictTimestamps.clear();
      nextSequence = 0;
    },
  };
}
