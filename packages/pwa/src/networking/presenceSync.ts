import type { PlayerId } from '@scryglass/core';

export type PresenceZone = 'hand' | 'battlefield' | 'graveyard' | 'exile' | 'commandZone';
export type PresenceInteraction = 'hover' | 'drag';

export interface MatchPresence {
  player: PlayerId;
  zone: PresenceZone;
  cardId: string | null;
  interaction: PresenceInteraction | null;
  position: { x: number; y: number } | null;
  cleared: boolean;
}

export interface MatchPresenceUpdate {
  player: PlayerId;
  zone: PresenceZone;
  cardId?: string;
  interaction?: PresenceInteraction;
  position?: { x: number; y: number };
  cleared?: boolean;
}

interface PresenceEnvelope {
  k: 'p';
  p: PlayerId;
  z: PresenceZone;
  a: 'h' | 'd' | 'c';
  c?: string;
  x?: number;
  y?: number;
}

const PRESENCE_ZONES = new Set<PresenceZone>(['hand', 'battlefield', 'graveyard', 'exile', 'commandZone']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toRoundedCoordinate(value: number | undefined): number | undefined {
  if (value == null || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.round(value);
}

export function createPresenceMessage(update: MatchPresenceUpdate): string {
  const x = toRoundedCoordinate(update.position?.x);
  const y = toRoundedCoordinate(update.position?.y);
  const envelope: PresenceEnvelope = {
    k: 'p',
    p: update.player,
    z: update.zone,
    a: update.cleared ? 'c' : update.interaction === 'drag' ? 'd' : 'h',
    ...(update.cardId != null ? { c: update.cardId } : {}),
    ...(x != null ? { x } : {}),
    ...(y != null ? { y } : {}),
  };

  return JSON.stringify(envelope);
}

export function parsePresenceMessage(message: string): MatchPresence | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(message);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) {
    return null;
  }

  const { k, p, z, a, c, x, y } = parsed;
  if (k !== 'p' || typeof p !== 'string' || !PRESENCE_ZONES.has(z as PresenceZone) || (a !== 'h' && a !== 'd' && a !== 'c')) {
    return null;
  }

  if (c != null && typeof c !== 'string') {
    return null;
  }

  if (x != null && (typeof x !== 'number' || !Number.isFinite(x))) {
    return null;
  }

  if (y != null && (typeof y !== 'number' || !Number.isFinite(y))) {
    return null;
  }

  return {
    player: p as PlayerId,
    zone: z as PresenceZone,
    cardId: typeof c === 'string' ? c : null,
    interaction: a === 'c' ? null : a === 'd' ? 'drag' : 'hover',
    position: x == null || y == null ? null : { x, y },
    cleared: a === 'c',
  };
}
