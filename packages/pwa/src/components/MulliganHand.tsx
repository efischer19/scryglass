import { countLands, getMulliganVerdict } from '@scryglass/core';
import type { PlayerState, Action, GameState, Card } from '@scryglass/core';
import { CardImage } from './CardDisplay.js';

interface MulliganHandProps {
  player: 'A' | 'B';
  playerState: PlayerState;
  settings: GameState['settings'];
  onDispatch: (action: Action) => void;
}

const PLAYER_LABELS: Record<'A' | 'B', string> = {
  A: 'Player A',
  B: 'Player B',
};

const VERDICT_DESCRIPTIONS: Record<string, string> = {
  must_mulligan: 'mulligan recommended',
  must_keep: 'must keep',
  user_choice: 'optional mulligan',
};

export function MulliganHand({ player, playerState, settings, onDispatch }: MulliganHandProps) {
  const label = PLAYER_LABELS[player];
  const isPreDeal = playerState.mulliganHand.length === 0;

  const landCount = isPreDeal ? 0 : countLands(playerState.mulliganHand);
  const verdict = isPreDeal ? 'must_keep' : getMulliganVerdict(landCount, settings);
  const mulliganDisabled = isPreDeal || verdict === 'must_keep';

  return (
    <section class="mulligan-hand" aria-label={`${label}'s opening hand`}>
      <h3 class="mulligan-hand__title">Opening Hand</h3>
      {!isPreDeal && (
        <p class="mulligan-hand__verdict">
          {landCount} land{landCount !== 1 ? 's' : ''} — {VERDICT_DESCRIPTIONS[verdict]}
        </p>
      )}
      <p class="mulligan-hand__mulligan-count">
        Mulligans taken: {playerState.mulliganCount}
      </p>

      <ul class="mulligan-hand__card-list" aria-label={`${label}'s hand cards`}>
        {playerState.mulliganHand.map((card: Card, i: number) => (
          <li key={i} class="mulligan-hand__card-item">
            <CardImage card={card} />
          </li>
        ))}
      </ul>

      <div class="mulligan-hand__actions">
        {isPreDeal ? (
          <button
            class="action-btn"
            type="button"
            onClick={() => onDispatch({ type: 'DEAL_OPENING_HAND', payload: { player } })}
            aria-label={`Deal initial hand for ${label}`}
          >
            Deal Initial
          </button>
        ) : (
          <>
            <button
              class="action-btn"
              type="button"
              onClick={() => onDispatch({ type: 'KEEP_HAND', payload: { player } })}
              aria-label={`Keep ${label}'s opening hand`}
            >
              Keep Hand
            </button>
            <button
              class="action-btn"
              type="button"
              disabled={mulliganDisabled}
              onClick={() => onDispatch({ type: 'MULLIGAN', payload: { player } })}
              aria-label={`Mulligan ${label}'s hand`}
            >
              Mulligan
            </button>
          </>
        )}
      </div>
    </section>
  );
}
