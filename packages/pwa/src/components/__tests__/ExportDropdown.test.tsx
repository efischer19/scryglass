import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { ExportDropdown } from '../ExportDropdown.js';
import type { Card } from '@scryglass/core';

const CARDS: Card[] = [
  { name: 'Island', setCode: 'ltr', collectorNumber: '715', cardType: 'land' },
  { name: 'Island', setCode: 'ltr', collectorNumber: '715', cardType: 'land' },
];

const COMMANDERS: Card[] = [
  {
    name: 'Galadriel, Light of Valinor',
    setCode: 'ltc',
    collectorNumber: '498',
    cardType: 'commander',
  },
];

describe('<ExportDropdown />', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('renders export options including native scryglass', () => {
    render(<ExportDropdown cards={CARDS} commanders={COMMANDERS} />);
    expect(screen.getByLabelText('Export')).toBeTruthy();
    expect(screen.getByRole('option', { name: 'scryglass format' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'MTGO/Arena' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Moxfield CSV' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Archidekt text' })).toBeTruthy();
  });

  it('copies selected format output to clipboard and shows confirmation', async () => {
    render(<ExportDropdown cards={CARDS} commanders={COMMANDERS} />);

    fireEvent.change(screen.getByLabelText('Export'), { target: { value: 'mtgo-arena' } });
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Export copied to clipboard.')).toBeTruthy();
    });
  });

  it('downloads selected format output', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<ExportDropdown cards={CARDS} commanders={COMMANDERS} />);
    fireEvent.change(screen.getByLabelText('Export'), { target: { value: 'moxfield' } });
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Export downloaded.')).toBeTruthy();
  });
});
