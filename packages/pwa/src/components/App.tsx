import { useState } from 'preact/hooks';
import { createInitialState, dispatch } from '@scryglass/core';
import type { Action, Card, ConvertResult } from '@scryglass/core';
import { Header } from './Header.js';
import { PlayerZone } from './PlayerZone.js';
import { Router, navigate } from './Router.js';
import { DeckInput } from './DeckInput.js';
import { DeckEditor } from './DeckEditor.js';
import { ExportDropdown } from './ExportDropdown.js';
import { StatusBar } from './StatusBar.js';

export function App() {
  const [state, setState] = useState(createInitialState);
  const [editorResult, setEditorResult] = useState<ConvertResult | null>(null);
  const [playerLoadingPhase, setPlayerLoadingPhase] = useState<'A' | 'B'>('A');
  const [deckA, setDeckA] = useState<Card[] | null>(null);
  const [deckB, setDeckB] = useState<Card[] | null>(null);
  const [drawCounts, setDrawCounts] = useState<{ A: number; B: number }>({ A: 0, B: 0 });

  const handleDispatch = (action: Action) => {
    const result = dispatch(state, action);
    setState(result.state);
    if (action.type === 'DRAW_CARD') {
      const player = action.payload.player as 'A' | 'B';
      setDrawCounts((prev) => ({ ...prev, [player]: prev[player] + 1 }));
    }
    return result;
  };

  const resetToInput = () => {
    setPlayerLoadingPhase('A');
    setDeckA(null);
    setDeckB(null);
    setDrawCounts({ A: 0, B: 0 });
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
    const savedDeckA = deckA;
    let currentState = createInitialState();
    const r1 = dispatch(currentState, { type: 'LOAD_DECK', payload: { player: 'A', cards: savedDeckA } });
    currentState = r1.state;
    const r2 = dispatch(currentState, { type: 'SHUFFLE_LIBRARY', payload: { player: 'A' } });
    currentState = r2.state;
    const r3 = dispatch(currentState, { type: 'LOAD_DECK', payload: { player: 'B', cards } });
    currentState = r3.state;
    const r4 = dispatch(currentState, { type: 'SHUFFLE_LIBRARY', payload: { player: 'B' } });
    currentState = r4.state;
    setState(currentState);
    setEditorResult(null);
    setPlayerLoadingPhase('A');
    setDeckA(savedDeckA);
    setDeckB(cards);
    setDrawCounts({ A: 0, B: 0 });
    navigate('#/app');
  };

  const handleNewGame = () => {
    if (deckA === null || deckB === null) {
      return;
    }
    let currentState = createInitialState();
    const r1 = dispatch(currentState, { type: 'LOAD_DECK', payload: { player: 'A', cards: deckA } });
    currentState = r1.state;
    const r2 = dispatch(currentState, { type: 'LOAD_DECK', payload: { player: 'B', cards: deckB } });
    currentState = r2.state;
    const r3 = dispatch(currentState, { type: 'DEAL_OPENING_HAND', payload: { player: 'A' } });
    currentState = r3.state;
    const r4 = dispatch(currentState, { type: 'DEAL_OPENING_HAND', payload: { player: 'B' } });
    currentState = r4.state;
    setState(currentState);
    setDrawCounts({ A: 0, B: 0 });
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
      <StatusBar mode="deck-selection" player={playerLoadingPhase} />
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
      <Header onLoadDecks={() => { resetToInput(); navigate('#/input'); }} onNewGame={deckA !== null && deckB !== null ? handleNewGame : undefined} />
      <StatusBar mode="game" drawCounts={drawCounts} />
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
