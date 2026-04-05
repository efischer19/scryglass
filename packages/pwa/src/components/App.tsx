import { useState } from 'preact/hooks';
import { createInitialState, dispatch } from '@scryglass/core';
import type { Action, Card } from '@scryglass/core';
import { Header } from './Header.js';
import { PlayerZone } from './PlayerZone.js';
import { Router, navigate } from './Router.js';
import { DeckInput } from './DeckInput.js';

export function App() {
  const [state, setState] = useState(createInitialState);

  const handleDispatch = (action: Action) => {
    const result = dispatch(state, action);
    setState(result.state);
    return result;
  };

  const handleLoadDeck = (cards: Card[]) => {
    handleDispatch({ type: 'LOAD_DECK', payload: { player: 'A', cards } });
    handleDispatch({ type: 'LOAD_DECK', payload: { player: 'B', cards } });
    navigate('#/app');
  };

  const inputView = (
    <main>
      <Header onLoadDecks={() => { /* Ticket 06 */ }} />
      <DeckInput onLoadDeck={handleLoadDeck} />
    </main>
  );

  const appView = (
    <main>
      <Header onLoadDecks={() => navigate('#/input')} />
      <div class="pod-layout">
        <PlayerZone
          player="A"
          playerState={state.players.A}
          onDispatch={handleDispatch}
        />
        <PlayerZone
          player="B"
          playerState={state.players.B}
          onDispatch={handleDispatch}
        />
      </div>
    </main>
  );

  return <Router inputView={inputView} appView={appView} />;
}
