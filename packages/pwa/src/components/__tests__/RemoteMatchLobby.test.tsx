import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { RemoteMatchLobby } from '../RemoteMatchLobby.js';

describe('<RemoteMatchLobby />', () => {
  it('lets a guest enter a room code and submit it', () => {
    const handleJoinMatch = vi.fn();

    render(
      <RemoteMatchLobby
        currentRoomCode=""
        role={null}
        status="idle"
        error={null}
        lastMessage={null}
        onHostMatch={() => {}}
        onJoinMatch={handleJoinMatch}
        onResetMatch={() => {}}
      />,
    );

    const input = screen.getByLabelText(/room code/i);
    fireEvent.input(input, { target: { value: 'room-123' } });
    fireEvent.click(screen.getByRole('button', { name: /join match/i }));

    expect(handleJoinMatch).toHaveBeenCalledWith('ROOM123');
  });

  it('shows the generated room code, invite URL, and waiting copy for a host', () => {
    render(
      <RemoteMatchLobby
        currentRoomCode="ROOM123"
        role="host"
        status="hosting"
        error={null}
        lastMessage={null}
        onHostMatch={() => {}}
        onJoinMatch={() => {}}
        onResetMatch={() => {}}
      />,
    );

    expect(screen.getByText(/waiting for a guest to join this room/i)).toBeTruthy();
    expect(screen.getByText('ROOM123')).toBeTruthy();
    expect(screen.getByText('http://localhost:3000/match/ROOM123')).toBeTruthy();
    expect(screen.getByText('host')).toBeTruthy();
  });

  it('passes vitest-axe accessibility assertions', async () => {
    const { container } = render(
      <RemoteMatchLobby
        currentRoomCode=""
        role={null}
        status="idle"
        error={null}
        lastMessage={null}
        onHostMatch={() => {}}
        onJoinMatch={() => {}}
        onResetMatch={() => {}}
      />,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
