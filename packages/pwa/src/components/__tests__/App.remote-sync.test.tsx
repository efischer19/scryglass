import { render, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { parseRemoteActionEnvelope } from '../../networking/actionSync.js';
import { App } from '../App.js';

const sendMessage = vi.fn();

vi.mock('../../networking/useWebRtcMatch.js', () => ({
  useWebRtcMatch: () => ({
    status: 'connected',
    roomCode: 'ROOM123',
    role: 'host',
    error: null,
    lastMessage: null,
    hostMatch: vi.fn(),
    joinMatch: vi.fn(),
    resetMatch: vi.fn(),
    sendMessage,
  }),
}));

describe('<App /> remote sync', () => {
  it('broadcasts a SYNC_STATE snapshot when the host connection becomes active', async () => {
    sendMessage.mockClear();

    render(<App />);

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledTimes(1);
    });

    const envelope = parseRemoteActionEnvelope(sendMessage.mock.calls[0][0]);
    expect(envelope?.action.type).toBe('SYNC_STATE');
    expect(envelope?.action.payload).toEqual({
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
        localMode: false,
      },
      history: [],
    });
  });
});
