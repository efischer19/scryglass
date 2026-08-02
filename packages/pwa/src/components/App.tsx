import { useState } from 'preact/hooks';
import { createInitialState, dispatch, PLAYER_IDS } from '@scryglass/core';
import type { Action, Card, ConvertResult, PlayerId } from '@scryglass/core';
import { Header } from './Header.js';
import { PlayerZone } from './PlayerZone.js';
import { Router, navigate, navigateHome, navigateToMatch } from './Router.js';
import { DeckInput } from './DeckInput.js';
import { DeckEditor } from './DeckEditor.js';
import { ExportDropdown } from './ExportDropdown.js';
import { StatusBar } from './StatusBar.js';
import { GameHistory } from './GameHistory.js';
import { PreGameSettings } from './PreGameSettings.js';
import type { GameSettings } from './PreGameSettings.js';
import { RemoteMatchLobby } from './RemoteMatchLobby.js';
import { useWebRtcMatch } from '../networking/useWebRtcMatch.js';

export function App() {
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
  const [state, setState] = useState(() => createInitialState());
  const [editorResult, setEditorResult] = useState<ConvertResult | null>(null);
  const [playerLoadingPhase, setPlayerLoadingPhase] = useState<PlayerId>('A');
  const [decks, setDecks] = useState<Partial<Record<PlayerId, Card[]>>>({});
  const [drawCounts, setDrawCounts] = useState<Partial<Record<PlayerId, number>>>({});
  const [visiblePlayer, setVisiblePlayer] = useState<PlayerId | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const {
    status: remoteStatus,
    roomCode: remoteRoomCode,
    role: remoteRole,
    error: remoteError,
    lastMessage: remoteLastMessage,
    hostMatch,
    joinMatch,
    resetMatch,
  } = useWebRtcMatch();

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
    setDrawCounts({});
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
    for (const player of players) {
      const loaded = dispatch(currentState, {
        type: 'LOAD_DECK',
        payload: { player, cards: allDecks[player], mode: 'local' },
      });
      currentState = loaded.state;
      const shuffled = dispatch(currentState, {
        type: 'SHUFFLE_LIBRARY',
        payload: { player },
      });
      currentState = shuffled.state;
    }
    setState(currentState);
    setEditorResult(null);
    const initialCounts: Partial<Record<PlayerId, number>> = {};
    for (const player of players) {
      initialCounts[player] = 0;
    }
    setDrawCounts(initialCounts);
    navigate('#/app');
  };

  const handleLoadDeck = (cards: Card[]) => {
    if (!gameSettings) {
      return;
    }

    const players = PLAYER_IDS.slice(0, gameSettings.playerCount);
    const currentIndex = players.indexOf(playerLoadingPhase);

    if (currentIndex < players.length - 1) {
      setDecks((prev) => ({ ...prev, [playerLoadingPhase]: cards }));
      setPlayerLoadingPhase(players[currentIndex + 1]);
      return;
    }

    const allDecks = { ...decks, [playerLoadingPhase]: cards } as Record<PlayerId, Card[]>;
    setDecks(allDecks);
    startGame(allDecks, gameSettings);
  };

  const handleNewGame = () => {
    if (!gameSettings) {
      return;
    }

    const players = PLAYER_IDS.slice(0, gameSettings.playerCount);
    const allReady = players.every((player) => decks[player] != null);
    if (!allReady) {
      return;
    }

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

  const handleHostMatch = () => {
    const nextRoomCode = hostMatch();
    navigateToMatch(nextRoomCode);
  };

  const handleJoinMatch = (roomCode: string) => {
    const nextRoomCode = joinMatch(roomCode);
    navigateToMatch(nextRoomCode);
  };

  const handleResetMatch = () => {
    resetMatch();
    navigateHome();
  };

  const allDecksLoaded =
    gameSettings != null &&
    PLAYER_IDS.slice(0, gameSettings.playerCount).every((player) => decks[player] != null);

  const remoteMatchLobby = (routeRoomCode?: string) => (
    <RemoteMatchLobby
      currentRoomCode={remoteRoomCode}
      routeRoomCode={routeRoomCode}
      role={remoteRole}
      status={remoteStatus}
      error={remoteError}
      lastMessage={remoteLastMessage}
      onHostMatch={handleHostMatch}
      onJoinMatch={handleJoinMatch}
      onResetMatch={handleResetMatch}
    />
  );

  const inputView = (
    <main id="main-content">
      <Header onLoadDecks={resetToInput} />
      {remoteMatchLobby()}
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
      <Header
        onLoadDecks={() => {
          resetToInput();
          navigate('#/input');
        }}
        onNewGame={allDecksLoaded ? handleNewGame : undefined}
      />
      <StatusBar mode="game" drawCounts={drawCounts} activePlayers={activePlayers} />
      <div class="game-toolbar">
        <ExportDropdown cards={state.players.A?.library ?? []} />
        <button
          class="action-btn game-toolbar__history-btn"
          type="button"
          onClick={() => setHistoryOpen(true)}
          aria-label="Open game history"
        >
          History
        </button>
      </div>
      <GameHistory
        history={state.history}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
      <div class="pod-layout">
        {activePlayers.map((player) => {
          const playerState = state.players[player];
          if (!playerState) {
            return null;
          }

          const otherPhases = activePlayers
            .filter((id) => id !== player)
            .map((id) => state.players[id]?.phase ?? 'loading');
          const allOthersPlaying = otherPhases.every((phase) => phase === 'playing');
          const otherPlayerPhase = allOthersPlaying ? 'playing' as const : 'loading' as const;
          return (
            <PlayerZone
              key={player}
              player={player}
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

  return (
    <Router
      inputView={inputView}
      editorView={editorView}
      appView={appView}
      matchView={(roomCode) => (
        <main id="main-content">
          <Header
            onLoadDecks={() => {
              resetToInput();
              handleResetMatch();
            }}
          />
          {remoteMatchLobby(roomCode)}
        </main>
      )}
    />
  );
}
