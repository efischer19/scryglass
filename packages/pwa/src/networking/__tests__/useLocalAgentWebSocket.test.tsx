import { act, fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  LOCAL_AGENT_WEBSOCKET_URL,
  useLocalAgentWebSocket,
} from '../useLocalAgentWebSocket.js';

const { socketInstances, FakeWebSocket } = vi.hoisted(() => {
  const OPEN = 1;
  const instances: Array<{
    url: string;
    readyState: number;
    send: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    listeners: Record<string, Array<(event?: { data?: unknown }) => void>>;
  }> = [];

  class MockWebSocket {
    static readonly OPEN = OPEN;
    readyState = 0;
    readonly send = vi.fn();
    readonly close = vi.fn(() => {
      this.readyState = 3;
    });
    readonly listeners: Record<string, Array<(event?: { data?: unknown }) => void>> = {};

    constructor(public readonly url: string) {
      instances.push(this);
    }

    addEventListener(type: string, listener: (event?: { data?: unknown }) => void) {
      this.listeners[type] ??= [];
      this.listeners[type].push(listener);
    }

    emit(type: string, event?: { data?: unknown }) {
      for (const listener of this.listeners[type] ?? []) {
        listener(event);
      }
    }
  }

  return {
    socketInstances: instances,
    FakeWebSocket: MockWebSocket,
  };
});

function Harness({ enabled = true, onMessage = vi.fn() }: { enabled?: boolean; onMessage?: (message: string) => void }) {
  const socket = useLocalAgentWebSocket({ enabled, onMessage });

  return (
    <div>
      <p data-testid="status">{socket.status}</p>
      <button type="button" onClick={() => socket.sendMessage('{"type":"PING"}')}>
        Send
      </button>
    </div>
  );
}

describe('useLocalAgentWebSocket', () => {
  beforeEach(() => {
    socketInstances.length = 0;
    vi.stubGlobal('WebSocket', FakeWebSocket);
  });

  it('connects to the default localhost socket and forwards incoming messages', () => {
    const onMessage = vi.fn();
    render(<Harness onMessage={onMessage} />);

    expect(socketInstances).toHaveLength(1);
    expect(socketInstances[0]?.url).toBe(LOCAL_AGENT_WEBSOCKET_URL);

    act(() => {
      socketInstances[0]!.readyState = FakeWebSocket.OPEN;
      socketInstances[0]!.emit('open');
    });

    expect(screen.getByTestId('status').textContent).toBe('open');

    act(() => {
      socketInstances[0]!.emit('message', { data: '{"type":"DRAW_CARD","payload":{"player":"A"}}' });
    });

    expect(onMessage).toHaveBeenCalledWith('{"type":"DRAW_CARD","payload":{"player":"A"}}');
  });

  it('sends messages only after the socket opens', () => {
    render(<Harness onMessage={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(socketInstances[0]?.send).not.toHaveBeenCalled();

    act(() => {
      socketInstances[0]!.readyState = FakeWebSocket.OPEN;
      socketInstances[0]!.emit('open');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(socketInstances[0]?.send).toHaveBeenCalledWith('{"type":"PING"}');
  });
});
