import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import {
  type ConnectionStatus,
  type ConnectionRole,
  WebRtcDataChannelManager,
  generateRoomCode,
  normalizeRoomCode,
} from './WebRtcDataChannelManager.js';

interface UseWebRtcMatchOptions {
  signalingBaseUrl?: string;
  onMessage?: (message: string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

interface StartConnectionOptions {
  role: ConnectionRole;
  roomCode: string;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown WebRTC error.';
}

export function useWebRtcMatch(options: UseWebRtcMatchOptions = {}) {
  const managerRef = useRef<WebRtcDataChannelManager | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [roomCode, setRoomCode] = useState('');
  const [role, setRole] = useState<ConnectionRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const clearManager = useCallback((resetSession: boolean) => {
    const manager = managerRef.current;
    managerRef.current = null;
    manager?.disconnect();

    if (resetSession) {
      setStatus('idle');
      setRoomCode('');
      setRole(null);
      setError(null);
      setLastMessage(null);
    }
  }, []);

  const startConnection = useCallback(({ role: nextRole, roomCode: nextRoomCode }: StartConnectionOptions) => {
    clearManager(false);
    setStatus(nextRole === 'host' ? 'hosting' : 'joining');
    setRoomCode(nextRoomCode);
    setRole(nextRole);
    setError(null);
    setLastMessage(null);

    const manager = new WebRtcDataChannelManager({
      role: nextRole,
      roomCode: nextRoomCode,
      signalingBaseUrl: options.signalingBaseUrl,
      onMessage: (message) => {
        if (managerRef.current !== manager) {
          return;
        }

        setLastMessage(message);
        options.onMessage?.(message);
      },
      onConnect: () => {
        if (managerRef.current !== manager) {
          return;
        }

        setStatus('connected');
        options.onConnect?.();
      },
      onDisconnect: () => {
        if (managerRef.current !== manager) {
          return;
        }

        setStatus((currentStatus) => currentStatus === 'error' ? currentStatus : 'disconnected');
        options.onDisconnect?.();
      },
      onError: (connectionError) => {
        if (managerRef.current !== manager) {
          return;
        }

        setError(connectionError.message);
        setStatus('error');
        options.onError?.(connectionError);
      },
    });

    managerRef.current = manager;

    void manager.connect().catch((connectionError: unknown) => {
      if (managerRef.current !== manager) {
        return;
      }

      managerRef.current = null;
      setError(getErrorMessage(connectionError));
      setStatus('error');
    });
  }, [clearManager, options]);

  const hostMatch = useCallback(() => {
    const nextRoomCode = generateRoomCode();
    startConnection({ role: 'host', roomCode: nextRoomCode });
    return nextRoomCode;
  }, [startConnection]);

  const joinMatch = useCallback((inputRoomCode: string) => {
    const nextRoomCode = normalizeRoomCode(inputRoomCode);
    startConnection({ role: 'guest', roomCode: nextRoomCode });
    return nextRoomCode;
  }, [startConnection]);

  const resetMatch = useCallback(() => {
    clearManager(true);
  }, [clearManager]);

  const sendMessage = useCallback((message: string) => {
    managerRef.current?.send(message);
  }, []);

  useEffect(() => () => {
    clearManager(false);
  }, [clearManager]);

  return {
    status,
    roomCode,
    role,
    error,
    lastMessage,
    hostMatch,
    joinMatch,
    resetMatch,
    sendMessage,
  };
}
