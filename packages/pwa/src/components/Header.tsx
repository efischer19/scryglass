interface HeaderProps {
  onLoadDecks: () => void;
}

export function Header({ onLoadDecks }: HeaderProps) {
  return (
    <header class="app-header">
      <h1 class="app-header__title">Scryglass</h1>
      <button
        class="app-header__btn"
        type="button"
        onClick={onLoadDecks}
        aria-label="Load Decks"
      >
        Load Decks
      </button>
    </header>
  );
}
