import { useState } from 'preact/hooks';
import type { PlayerId } from '@scryglass/core';
import { PLAYER_IDS } from '@scryglass/core';

export interface GameSettings {
  playerCount: number;
  allowMulliganWith2or5Lands: boolean;
}

interface PreGameSettingsProps {
  onConfirm: (settings: GameSettings) => void;
}

const PLAYER_COUNT_OPTIONS = [1, 2, 3, 4] as const;

function playerLabel(id: PlayerId): string {
  return `Player ${id}`;
}

export function PreGameSettings({ onConfirm }: PreGameSettingsProps) {
  const [playerCount, setPlayerCount] = useState(2);
  const [allowMulliganWith2or5Lands, setAllowMulliganWith2or5Lands] = useState(false);

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    onConfirm({ playerCount, allowMulliganWith2or5Lands });
  };

  return (
    <section class="pre-game-settings" aria-label="Pre-game settings">
      <h2 class="pre-game-settings__title">Game Settings</h2>
      <form class="pre-game-settings__form" onSubmit={handleSubmit}>
        <fieldset class="pre-game-settings__fieldset">
          <legend class="pre-game-settings__legend">Players</legend>
          <label class="pre-game-settings__label" for="player-count-select">
            Number of players:
          </label>
          <select
            id="player-count-select"
            class="pre-game-settings__select"
            value={String(playerCount)}
            onChange={(e) => setPlayerCount(Number((e.target as HTMLSelectElement).value))}
            aria-label="Number of players"
          >
            {PLAYER_COUNT_OPTIONS.map((n) => (
              <option key={n} value={String(n)}>
                {n} — {PLAYER_IDS.slice(0, n).map(playerLabel).join(', ')}
              </option>
            ))}
          </select>
        </fieldset>

        <fieldset class="pre-game-settings__fieldset">
          <legend class="pre-game-settings__legend">Mulligan Rules</legend>
          <label class="pre-game-settings__checkbox-label">
            <input
              type="checkbox"
              checked={allowMulliganWith2or5Lands}
              onChange={(e) => setAllowMulliganWith2or5Lands((e.target as HTMLInputElement).checked)}
              aria-label="Allow mulligan with 2 or 5 lands"
            />
            Allow optional mulligan with 2 or 5 lands
          </label>
          <p class="pre-game-settings__hint">
            When enabled, hands with exactly 2 or 5 lands give the player a choice to mulligan.
            When disabled, those hands must be kept.
          </p>
        </fieldset>

        <button class="pre-game-settings__start-btn" type="submit">
          Start Game
        </button>
      </form>
    </section>
  );
}
