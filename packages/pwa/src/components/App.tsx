import { useState, useLayoutEffect } from 'preact/hooks';
import { createInitialState, dispatch } from '@scryglass/core';
import type { Action, Card, ConvertResult, GameState } from '@scryglass/core';
import { Header } from './Header.js';
import { PlayerZone } from './PlayerZone.js';
import { Router, navigate } from './Router.js';
import { DeckInput } from './DeckInput.js';
import { DeckEditor } from './DeckEditor.js';
import { ExportDropdown } from './ExportDropdown.js';

export function App() {
  const [state, setState] = useState(createInitialState);
  const [editorResult, setEditorResult] = useState<ConvertResult | null>(null);
  const [playerLoadingPhase, setPlayerLoadingPhase] = useState<'A' | 'B'>('A');
  const [deckA, setDeckA] = useState<Card[] | null>(null);

  const handleDispatch = (action: Action) => {
    const result = dispatch(state, action);
    setState(result.state);
    return result;
  };

  // Expose game state for E2E test introspection via window.__SCRYGLASS_STATE__.
  // useLayoutEffect runs synchronously after React commits the render so that
  // Playwright can read the updated state as soon as the DOM reflects it.
  useLayoutEffect(() => {
    (window as Window & { __SCRYGLASS_STATE__?: GameState }).__SCRYGLASS_STATE__ = state;
  }, [state]);

  const resetToInput = () => {
    setPlayerLoadingPhase('A');
    setDeckA(null);
  };

  const handleLoadDeck = (cards: Card[]) => {
    if (playerLoadingPhase === 'A') {
      setDeckA(cards);
      setPlayerLoadingPhase('B');
      return;
    }
    if (deckA === null) {
      return;
    }
    let currentState = state;
    const r1 = dispatch(currentState, { type: 'LOAD_DECK', payload: { player: 'A', cards: deckA } });
    currentState = r1.state;
    const r2 = dispatch(currentState, { type: 'LOAD_DECK', payload: { player: 'B', cards } });
    currentState = r2.state;
    const r3 = dispatch(currentState, { type: 'DEAL_OPENING_HAND', payload: { player: 'A' } });
    currentState = r3.state;
    const r4 = dispatch(currentState, { type: 'DEAL_OPENING_HAND', payload: { player: 'B' } });
    currentState = r4.state;
    setState(currentState);
    setEditorResult(null);
    resetToInput();
    navigate('#/app');
  };

  const handleOpenEditor = (result: ConvertResult) => {
    setEditorResult(result);
    navigate('#/editor');
  };

  const handleCancelEditor = () => {
    setEditorResult(null);
    navigate('#/input');
  };

  const inputView = (
    <main id="main-content">
      <Header onLoadDecks={resetToInput} />
      <DeckInput
        key={playerLoadingPhase}
        player={playerLoadingPhase}
        onLoadDeck={handleLoadDeck}
        onOpenEditor={handleOpenEditor}
      />
    </main>
  );

  const editorView = (
    <main id="main-content">
      <Header onLoadDecks={() => navigate('#/input')} />
      {editorResult ? (
        <DeckEditor
          convertResult={editorResult}
          onLoadDeck={handleLoadDeck}
          onCancel={handleCancelEditor}
        />
      ) : (
        <p>No deck to edit. Return to the input page.</p>
      )}
    </main>
  );

  const appView = (
    <main id="main-content">
      <Header onLoadDecks={() => { resetToInput(); navigate('#/input'); }} />
      <ExportDropdown cards={state.players.A.library} />
      <div class="pod-layout">
        <PlayerZone
          player="A"
          playerState={state.players.A}
          otherPlayerPhase={state.players.B.phase}
          settings={state.settings}
          gameState={state}
          onDispatch={handleDispatch}
        />
        <PlayerZone
          player="B"
          playerState={state.players.B}
          otherPlayerPhase={state.players.A.phase}
          settings={state.settings}
          gameState={state}
          onDispatch={handleDispatch}
        />
      </div>
    </main>
  );

  return <Router inputView={inputView} editorView={editorView} appView={appView} />;
}
