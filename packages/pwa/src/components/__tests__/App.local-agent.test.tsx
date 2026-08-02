import { fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../App.js';

const sendLocalAgentMessage = vi.fn();

vi.mock('../../networking/useWebRtcMatch.js', () => ({
  useWebRtcMatch: () => ({
    status: 'idle',
    roomCode: '',
    role: null,
    error: null,
    lastMessage: null,
    hostMatch: vi.fn(),
    joinMatch: vi.fn(),
    resetMatch: vi.fn(),
    sendMessage: vi.fn(),
  }),
}));

vi.mock('../../networking/useLocalAgentWebSocket.js', () => ({
  useLocalAgentWebSocket: () => ({
    status: 'open',
    error: null,
    sendMessage: sendLocalAgentMessage,
    disconnect: vi.fn(),
  }),
}));

describe('<App /> local agent sync', () => {
  it('broadcasts the current GameState JSON when local AI mode is active', async () => {
    sendLocalAgentMessage.mockClear();

    render(<App />);
    fireEvent.click(screen.getByRole('checkbox', { name: /enable local ai agent/i }));
    fireEvent.click(screen.getByRole('button', { name: /start game/i }));

    await waitFor(() => {
      expect(sendLocalAgentMessage).toHaveBeenCalledTimes(1);
    });

    expect(JSON.parse(sendLocalAgentMessage.mock.calls[0][0])).toEqual({
      players: {
        A: {
          library: [],
          hand: [],
          battlefield: [],
          graveyard: [],
          exile: [],
          commandZone: [],
          phase: 'loading',
          mulliganHand: [],
          mulliganCount: 0,
        },
        B: {
          library: [],
          hand: [],
          battlefield: [],
          graveyard: [],
          exile: [],
          commandZone: [],
          phase: 'loading',
          mulliganHand: [],
          mulliganCount: 0,
        },
      },
      settings: {
        allowMulliganWith2or5Lands: false,
        localMode: true,
      },
      history: [],
    });
  });
});
