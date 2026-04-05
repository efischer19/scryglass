import { useState } from 'preact/hooks';
import { createInitialState, dispatch } from '@scryglass/core';
import type { Action } from '@scryglass/core';
import { Header } from './Header.js';
import { PlayerZone } from './PlayerZone.js';

export function App() {
  const [state, setState] = useState(createInitialState);

  const handleDispatch = (action: Action) => {
    const result = dispatch(state, action);
    setState(result.state);
    return result;
  };

  return (
    <main>
      <Header onLoadDecks={() => { /* Ticket 06 */ }} />
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
}
