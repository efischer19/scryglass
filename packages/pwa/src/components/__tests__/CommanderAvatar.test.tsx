import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { CommanderAvatar } from '../CommanderAvatar';
import type { Card } from '@scrymat/core';

vi.mock('../../scryfall/useCommanderAvatar', () => ({
  useCommanderAvatar: vi.fn(),
}));

import { useCommanderAvatar } from '../../scryfall/useCommanderAvatar';

const testCommander: Card = {
  name: 'Teferi, Master of Time',
  setCode: 'c21',
  collectorNumber: '48',
  cardType: 'commander',
};

describe('<CommanderAvatar />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('displays loading state initially', () => {
    vi.mocked(useCommanderAvatar).mockReturnValue({
      status: 'loading',
      imageUrl: null,
      collectorNumber: testCommander.collectorNumber,
    });

    render(<CommanderAvatar card={testCommander} />);

    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByText(testCommander.name)).toBeTruthy();
  });

  it('displays image when loaded', () => {
    vi.mocked(useCommanderAvatar).mockReturnValue({
      status: 'loaded',
      imageUrl: 'blob:mock/avatar',
      collectorNumber: testCommander.collectorNumber,
    });

    render(<CommanderAvatar card={testCommander} />);

    const img = screen.getByRole('img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('blob:mock/avatar');
    expect(img.getAttribute('alt')).toContain(testCommander.name);
  });

  it('displays fallback with card name when error occurs', () => {
    vi.mocked(useCommanderAvatar).mockReturnValue({
      status: 'error',
      imageUrl: null,
      collectorNumber: testCommander.collectorNumber,
    });

    render(<CommanderAvatar card={testCommander} />);

    expect(screen.getByText(testCommander.name)).toBeTruthy();
    // Should have the fallback class
    const { container } = render(<CommanderAvatar card={testCommander} />);
    expect(container.querySelector('.commander-avatar__fallback')).toBeTruthy();
  });

  it('displays fallback with card name when imageUrl is null', () => {
    vi.mocked(useCommanderAvatar).mockReturnValue({
      status: 'loaded',
      imageUrl: null,
      collectorNumber: testCommander.collectorNumber,
    });

    render(<CommanderAvatar card={testCommander} />);

    expect(screen.getByText(testCommander.name)).toBeTruthy();
  });

  it('calls useCommanderAvatar with correct parameters', () => {
    vi.mocked(useCommanderAvatar).mockReturnValue({
      status: 'loaded',
      imageUrl: 'blob:mock/avatar',
      collectorNumber: testCommander.collectorNumber,
    });

    render(<CommanderAvatar card={testCommander} />);

    expect(useCommanderAvatar).toHaveBeenCalledWith(
      testCommander.collectorNumber,
      testCommander.setCode,
    );
  });
});
