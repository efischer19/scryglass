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
    let currentState = state;
    const r1 = dispatch(currentState, { type: 'LOAD_DECK', payload: { player: 'A', cards } });
    currentState = r1.state;
    const r2 = dispatch(currentState, { type: 'LOAD_DECK', payload: { player: 'B', cards } });
    currentState = r2.state;
    const r3 = dispatch(currentState, { type: 'DEAL_OPENING_HAND', payload: { player: 'A' } });
    currentState = r3.state;
    const r4 = dispatch(currentState, { type: 'DEAL_OPENING_HAND', payload: { player: 'B' } });
    currentState = r4.state;
    setState(currentState);
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

  return <Router inputView={inputView} appView={appView} />;
}
