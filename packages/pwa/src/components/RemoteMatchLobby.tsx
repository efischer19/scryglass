import { useEffect, useMemo, useState } from 'preact/hooks';
import type { ConnectionRole, ConnectionStatus } from '../networking/WebRtcDataChannelManager.js';
import { normalizeRoomCode } from '../networking/WebRtcDataChannelManager.js';

interface RemoteMatchLobbyProps {
  currentRoomCode: string;
  routeRoomCode?: string;
  role: ConnectionRole | null;
  status: ConnectionStatus;
  error: string | null;
  lastMessage: string | null;
  onHostMatch: () => void;
  onJoinMatch: (roomCode: string) => void;
  onResetMatch: () => void;
}

function getStatusMessage(role: ConnectionRole | null, status: ConnectionStatus): string {
  if (role === 'host') {
    if (status === 'hosting') {
      return 'Waiting for a guest to join this room.';
    }

    if (status === 'connected') {
      return 'Guest connected. Data channel is ready.';
    }
  }

  if (role === 'guest') {
    if (status === 'joining') {
      return 'Joining match and waiting for the host connection to finish.';
    }

    if (status === 'connected') {
      return 'Connected to the host. Data channel is ready.';
    }
  }

  if (status === 'disconnected') {
    return 'Peer connection closed.';
  }

  if (status === 'error') {
    return 'Unable to establish the peer connection.';
  }

  return 'Create a room as the host or enter a room code to join as a guest.';
}

export function RemoteMatchLobby({
  currentRoomCode,
  routeRoomCode,
  role,
  status,
  error,
  lastMessage,
  onHostMatch,
  onJoinMatch,
  onResetMatch,
}: RemoteMatchLobbyProps) {
  const initialRoomCode = useMemo(
    () => routeRoomCode ?? currentRoomCode,
    [currentRoomCode, routeRoomCode],
  );
  const [guestRoomCode, setGuestRoomCode] = useState(initialRoomCode);

  useEffect(() => {
    setGuestRoomCode(initialRoomCode);
  }, [initialRoomCode]);

  const shareUrl = currentRoomCode
    ? `${window.location.origin}/match/${currentRoomCode}`
    : routeRoomCode
      ? `${window.location.origin}/match/${routeRoomCode}`
      : '';
  const normalizedGuestRoomCode = normalizeRoomCode(guestRoomCode);
  const statusMessage = getStatusMessage(role, status);

  const handleJoinSubmit = (event: Event) => {
    event.preventDefault();
    if (normalizedGuestRoomCode.length === 0) {
      return;
    }

    onJoinMatch(normalizedGuestRoomCode);
  };

  return (
    <section class="remote-match-lobby" aria-label="Remote match lobby">
      <div class="remote-match-lobby__header">
        <h2 class="remote-match-lobby__title">Remote Match</h2>
        <p class="remote-match-lobby__description">
          Use the signaling worker to exchange an SDP offer and answer, then move gameplay onto a reliable ordered RTCDataChannel.
        </p>
      </div>

      <div class="remote-match-lobby__grid">
        <article class="remote-match-lobby__panel" aria-labelledby="host-match-title">
          <h3 id="host-match-title" class="remote-match-lobby__panel-title">Host</h3>
          <p class="remote-match-lobby__panel-copy">
            Generate a room code, share it with your guest, and wait here for the peer connection to finish.
          </p>
          <button
            class="remote-match-lobby__action"
            type="button"
            onClick={onHostMatch}
          >
            Generate Room Code
          </button>
        </article>

        <article class="remote-match-lobby__panel" aria-labelledby="join-match-title">
          <h3 id="join-match-title" class="remote-match-lobby__panel-title">Guest</h3>
          <p class="remote-match-lobby__panel-copy">
            Enter the host&apos;s room code to fetch the offer, post your answer, and open the shared data channel.
          </p>
          <form class="remote-match-lobby__join-form" onSubmit={handleJoinSubmit}>
            <label class="remote-match-lobby__label" for="remote-room-code">
              Room code
            </label>
            <input
              id="remote-room-code"
              class="remote-match-lobby__input"
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
              spellcheck={false}
              maxLength={32}
              value={guestRoomCode}
              onInput={(event) => {
                const nextValue = normalizeRoomCode((event.target as HTMLInputElement).value);
                setGuestRoomCode(nextValue);
              }}
            />
            <button
              class="remote-match-lobby__action"
              type="submit"
              disabled={normalizedGuestRoomCode.length === 0}
            >
              Join Match
            </button>
          </form>
        </article>
      </div>

      <div class="remote-match-lobby__status" aria-live="polite" aria-atomic="true">
        <p class="remote-match-lobby__status-copy">{statusMessage}</p>
        {(currentRoomCode || routeRoomCode) && (
          <dl class="remote-match-lobby__details">
            <div>
              <dt>Room code</dt>
              <dd>{currentRoomCode || routeRoomCode}</dd>
            </div>
            {shareUrl && (
              <div>
                <dt>Invite URL</dt>
                <dd>{shareUrl}</dd>
              </div>
            )}
            {role && (
              <div>
                <dt>Role</dt>
                <dd>{role}</dd>
              </div>
            )}
          </dl>
        )}
        {lastMessage && (
          <p class="remote-match-lobby__last-message">
            Last payload: <code>{lastMessage}</code>
          </p>
        )}
        {error && (
          <p class="remote-match-lobby__error" role="alert">
            {error}
          </p>
        )}
        {(currentRoomCode || role) && (
          <button
            class="remote-match-lobby__reset"
            type="button"
            onClick={onResetMatch}
          >
            Leave Match
          </button>
        )}
      </div>
    </section>
  );
}
