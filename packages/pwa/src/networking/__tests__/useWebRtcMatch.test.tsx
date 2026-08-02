import { act, fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useWebRtcMatch } from '../useWebRtcMatch.js';

const { managerInstances, FakeWebRtcDataChannelManager } = vi.hoisted(() => {
  const instances: Array<{
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
    options: {
      role: 'host' | 'guest';
      roomCode: string;
      onConnect?: () => void;
      onDisconnect?: () => void;
    };
  }> = [];

  class FakeManager {
    readonly connect = vi.fn(async () => {});
    readonly disconnect = vi.fn(() => {});
    readonly send = vi.fn();

    constructor(public readonly options: {
      role: 'host' | 'guest';
      roomCode: string;
      onConnect?: () => void;
      onDisconnect?: () => void;
    }) {
      instances.push(this);
    }
  }

  return {
    managerInstances: instances,
    FakeWebRtcDataChannelManager: FakeManager,
  };
});

vi.mock('../WebRtcDataChannelManager.js', () => ({
  WebRtcDataChannelManager: FakeWebRtcDataChannelManager,
  generateRoomCode: () => 'ROOM123',
  normalizeRoomCode: (roomCode: string) => roomCode.toUpperCase(),
}));

function Harness() {
  const match = useWebRtcMatch({ reconnectDelayMs: 50 });

  return (
    <div>
      <p data-testid="status">{match.status}</p>
      <p data-testid="room-code">{match.roomCode}</p>
      <button type="button" onClick={() => match.hostMatch()}>
        Host
      </button>
      <button type="button" onClick={() => match.resetMatch()}>
        Reset
      </button>
    </div>
  );
}

describe('useWebRtcMatch', () => {
  beforeEach(() => {
    managerInstances.length = 0;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('restarts the same room automatically after a disconnect', async () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Host' }));

    expect(screen.getByTestId('status').textContent).toBe('hosting');
    expect(screen.getByTestId('room-code').textContent).toBe('ROOM123');
    expect(managerInstances).toHaveLength(1);
    expect(managerInstances[0]?.connect).toHaveBeenCalledTimes(1);

    act(() => {
      managerInstances[0]?.options.onDisconnect?.();
    });

    expect(screen.getByTestId('status').textContent).toBe('disconnected');

    await act(async () => {
      vi.advanceTimersByTime(50);
      await Promise.resolve();
    });

    expect(managerInstances).toHaveLength(2);
    expect(managerInstances[0]?.disconnect).toHaveBeenCalledTimes(1);
    expect(managerInstances[1]?.options.role).toBe('host');
    expect(managerInstances[1]?.options.roomCode).toBe('ROOM123');
    expect(managerInstances[1]?.connect).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('status').textContent).toBe('hosting');

    act(() => {
      managerInstances[1]?.options.onConnect?.();
    });

    expect(screen.getByTestId('status').textContent).toBe('connected');
  });
});
