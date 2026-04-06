interface HeaderProps {
  onLoadDecks: () => void;
  onNewGame?: () => void;
}

export function Header({ onLoadDecks, onNewGame }: HeaderProps) {
  return (
    <header class="app-header">
      <h1 class="app-header__title">Scryglass</h1>
      <div class="app-header__actions">
        {onNewGame && (
          <button
            class="app-header__btn app-header__btn--new-game"
            type="button"
            onClick={onNewGame}
            aria-label="New Game"
          >
            New Game
          </button>
        )}
        <button
          class="app-header__btn"
          type="button"
          onClick={onLoadDecks}
          aria-label="Load Decks"
        >
          Load Decks
        </button>
      </div>
    </header>
  );
}
