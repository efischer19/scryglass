import { useState } from 'preact/hooks';
import { createInitialState, dispatch, PLAYER_IDS } from '@scryglass/core';
import type { Action, Card, ConvertResult, PlayerId } from '@scryglass/core';
import { Header } from './Header.js';
import { PlayerZone } from './PlayerZone.js';
import { Router, navigate } from './Router.js';
import { DeckInput } from './DeckInput.js';
import { DeckEditor } from './DeckEditor.js';
import { ExportDropdown } from './ExportDropdown.js';
import { StatusBar } from './StatusBar.js';
import { PreGameSettings } from './PreGameSettings.js';
import type { GameSettings } from './PreGameSettings.js';

export function App() {
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
  const [state, setState] = useState(() => createInitialState());
  const [editorResult, setEditorResult] = useState<ConvertResult | null>(null);
  const [playerLoadingPhase, setPlayerLoadingPhase] = useState<PlayerId>('A');
  const [decks, setDecks] = useState<Partial<Record<PlayerId, Card[]>>>({});
  const [drawCounts, setDrawCounts] = useState<Partial<Record<PlayerId, number>>>({});
  const [visiblePlayer, setVisiblePlayer] = useState<PlayerId | null>(null);

  const playerCount = gameSettings?.playerCount ?? 2;
  const activePlayers = PLAYER_IDS.slice(0, playerCount);

  const handleDispatch = (action: Action) => {
    const result = dispatch(state, action);
    setState(result.state);
    if (action.type === 'DRAW_CARD') {
      const player = action.payload.player as PlayerId;
      setDrawCounts((prev) => ({ ...prev, [player]: (prev[player] ?? 0) + 1 }));
    }
    return result;
  };

  const resetToInput = () => {
    setGameSettings(null);
    setPlayerLoadingPhase('A');
    setDecks({});
    const initialCounts: Partial<Record<PlayerId, number>> = {};
    setDrawCounts(initialCounts);
    setVisiblePlayer(null);
  };

  const handleSettingsConfirm = (settings: GameSettings) => {
    setGameSettings(settings);
    setPlayerLoadingPhase('A');
    setDecks({});
    const initialCounts: Partial<Record<PlayerId, number>> = {};
    for (let i = 0; i < settings.playerCount; i++) {
      initialCounts[PLAYER_IDS[i]] = 0;
    }
    setDrawCounts(initialCounts);
  };

  const startGame = (allDecks: Record<PlayerId, Card[]>, settings: GameSettings) => {
    const players = PLAYER_IDS.slice(0, settings.playerCount);
    let currentState = createInitialState(settings.playerCount, {
      allowMulliganWith2or5Lands: settings.allowMulliganWith2or5Lands,
    });
    for (const p of players) {
      const r1 = dispatch(currentState, { type: 'LOAD_DECK', payload: { player: p, cards: allDecks[p] } });
      currentState = r1.state;
      const r2 = dispatch(currentState, { type: 'SHUFFLE_LIBRARY', payload: { player: p } });
      currentState = r2.state;
    }
    setState(currentState);
    setEditorResult(null);
    const initialCounts: Partial<Record<PlayerId, number>> = {};
    for (const p of players) {
      initialCounts[p] = 0;
    }
    setDrawCounts(initialCounts);
    navigate('#/app');
  };

  const handleLoadDeck = (cards: Card[]) => {
    if (!gameSettings) return;
    const players = PLAYER_IDS.slice(0, gameSettings.playerCount);
    const currentIndex = players.indexOf(playerLoadingPhase);

    // Not the last player — save deck and move to next
    if (currentIndex < players.length - 1) {
      setDecks((prev) => ({ ...prev, [playerLoadingPhase]: cards }));
      setPlayerLoadingPhase(players[currentIndex + 1]);
      return;
    }

    // Last player — start game with all decks
    const allDecks = { ...decks, [playerLoadingPhase]: cards } as Record<PlayerId, Card[]>;
    setDecks(allDecks);
    startGame(allDecks, gameSettings);
  };

  const handleNewGame = () => {
    if (!gameSettings) return;
    const players = PLAYER_IDS.slice(0, gameSettings.playerCount);
    const allReady = players.every((p) => decks[p] != null);
    if (!allReady) return;

    const allDecks = decks as Record<PlayerId, Card[]>;
    startGame(allDecks, gameSettings);
    setVisiblePlayer(null);
  };

  const handleOpenEditor = (result: ConvertResult) => {
    setEditorResult(result);
    navigate('#/editor');
  };

  const handleCancelEditor = () => {
    setEditorResult(null);
    navigate('#/input');
  };

  const allDecksLoaded = gameSettings != null &&
    PLAYER_IDS.slice(0, gameSettings.playerCount).every((p) => decks[p] != null);

  const inputView = (
    <main id="main-content">
      <Header onLoadDecks={resetToInput} />
      {gameSettings === null ? (
        <PreGameSettings onConfirm={handleSettingsConfirm} />
      ) : (
        <>
          <StatusBar mode="deck-selection" player={playerLoadingPhase} />
          <DeckInput
            key={playerLoadingPhase}
            player={playerLoadingPhase}
            onLoadDeck={handleLoadDeck}
            onOpenEditor={handleOpenEditor}
          />
        </>
      )}
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
      <Header onLoadDecks={() => { resetToInput(); navigate('#/input'); }} onNewGame={allDecksLoaded ? handleNewGame : undefined} />
      <StatusBar mode="game" drawCounts={drawCounts} activePlayers={activePlayers} />
      <ExportDropdown cards={state.players.A?.library ?? []} />
      <div class="pod-layout">
        {activePlayers.map((p) => {
          const playerState = state.players[p];
          if (!playerState) return null;
          const otherPhases = activePlayers
            .filter((id) => id !== p)
            .map((id) => state.players[id]?.phase ?? 'loading');
          const allOthersPlaying = otherPhases.every((ph) => ph === 'playing');
          const otherPlayerPhase = allOthersPlaying ? 'playing' as const : 'loading' as const;
          return (
            <PlayerZone
              key={p}
              player={p}
              playerState={playerState}
              otherPlayerPhase={otherPlayerPhase}
              settings={state.settings}
              gameState={state}
              onDispatch={handleDispatch}
              visiblePlayer={visiblePlayer}
              onShowPlayer={setVisiblePlayer}
              onHideAll={() => setVisiblePlayer(null)}
            />
          );
        })}
      </div>
    </main>
  );

  return <Router inputView={inputView} editorView={editorView} appView={appView} />;
}
