import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

export const LOCAL_AGENT_WEBSOCKET_URL = 'ws://127.0.0.1:8765';

export type LocalAgentWebSocketStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

interface UseLocalAgentWebSocketOptions {
  enabled?: boolean;
  url?: string;
  onMessage?: (message: string) => void;
  onError?: (error: Error) => void;
}

function createConnectionError(url: string): Error {
  return new Error(`Unable to connect to local agent WebSocket at ${url}`);
}

export function useLocalAgentWebSocket(options: UseLocalAgentWebSocketOptions = {}) {
  const { enabled = false, onError, onMessage } = options;
  const url = options.url ?? LOCAL_AGENT_WEBSOCKET_URL;
  const socketRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<LocalAgentWebSocketStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const disconnect = useCallback(() => {
    const socket = socketRef.current;
    socketRef.current = null;
    socket?.close();
  }, []);

  useEffect(() => {
    if (!enabled) {
      disconnect();
      setStatus('idle');
      setError(null);
      return;
    }

    const socket = new WebSocket(url);
    socketRef.current = socket;
    setStatus('connecting');
    setError(null);

    socket.addEventListener('open', () => {
      if (socketRef.current !== socket) {
        return;
      }

      setStatus('open');
    });

    socket.addEventListener('message', (event) => {
      if (socketRef.current !== socket || typeof event.data !== 'string') {
        return;
      }

      onMessage?.(event.data);
    });

    socket.addEventListener('close', () => {
      if (socketRef.current !== socket) {
        return;
      }

      socketRef.current = null;
      setStatus('closed');
    });

    socket.addEventListener('error', () => {
      if (socketRef.current !== socket) {
        return;
      }

      const connectionError = createConnectionError(url);
      setStatus('error');
      setError(connectionError.message);
      onError?.(connectionError);
    });

    return () => {
      if (socketRef.current === socket) {
        socketRef.current = null;
      }

      socket.close();
    };
  }, [disconnect, enabled, onError, onMessage, url]);

  const sendMessage = useCallback((message: string) => {
    const socket = socketRef.current;
    if (socket == null || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    socket.send(message);
    return true;
  }, []);

  return {
    status,
    error,
    sendMessage,
    disconnect,
  };
}
