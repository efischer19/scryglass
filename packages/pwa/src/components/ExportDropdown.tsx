import {
  exportArchidekt,
  exportMoxfield,
  exportMtgoArena,
  exportScryglass,
} from '@scryglass/core';
import type { Card } from '@scryglass/core';
import { useState } from 'preact/hooks';
import { copyToClipboard } from '../utils/clipboard.js';

type ExportFormat = 'scryglass' | 'mtgo-arena' | 'moxfield' | 'archidekt';
type ExportMode = 'copy' | 'download';
const EXPORT_FORMATS: ExportFormat[] = ['scryglass', 'mtgo-arena', 'moxfield', 'archidekt'];

interface ExportDropdownProps {
  cards: Card[];
  commanders?: Card[];
}

function toExportText(format: ExportFormat, cards: Card[], commanders: Card[]): string {
  switch (format) {
    case 'mtgo-arena':
      return exportMtgoArena(cards, commanders);
    case 'moxfield':
      return exportMoxfield(cards, commanders);
    case 'archidekt':
      return exportArchidekt(cards, commanders);
    case 'scryglass':
      return exportScryglass(cards, commanders);
  }
}

function fileNameFor(format: ExportFormat): string {
  switch (format) {
    case 'mtgo-arena':
      return 'deck-mtgo-arena.txt';
    case 'moxfield':
      return 'deck-moxfield.csv';
    case 'archidekt':
      return 'deck-archidekt.txt';
    case 'scryglass':
      return 'deck-scryglass.txt';
  }
}

function mimeTypeFor(format: ExportFormat): string {
  if (format === 'moxfield') return 'text/csv;charset=utf-8';
  return 'text/plain;charset=utf-8';
}

function isExportFormat(value: string): value is ExportFormat {
  return EXPORT_FORMATS.includes(value as ExportFormat);
}

function downloadText(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ExportDropdown({ cards, commanders = [] }: ExportDropdownProps) {
  const [format, setFormat] = useState<ExportFormat>('scryglass');
  const [message, setMessage] = useState('');
  const canExport = cards.length > 0 || commanders.length > 0;

  const handleExport = async (mode: ExportMode) => {
    if (!canExport) return;

    const text = toExportText(format, cards, commanders);
    if (mode === 'copy') {
      const copied = await copyToClipboard(text);
      setMessage(
        copied
          ? 'Export copied to clipboard.'
          : 'Failed to copy (browser blocked clipboard access). Please use Download instead.',
      );
      return;
    }

    downloadText(text, fileNameFor(format), mimeTypeFor(format));
    setMessage('Export downloaded.');
  };

  return (
    <div class="export-dropdown">
      <label for="export-format" class="export-dropdown__label">
        Export
      </label>
      <select
        id="export-format"
        class="export-dropdown__select"
        value={format}
        onChange={(event) => {
          const value = (event.target as HTMLSelectElement).value;
          if (isExportFormat(value)) setFormat(value);
        }}
        disabled={!canExport}
      >
        <option value="scryglass">scryglass format</option>
        <option value="mtgo-arena">MTGO/Arena</option>
        <option value="moxfield">Moxfield CSV</option>
        <option value="archidekt">Archidekt text</option>
      </select>
      <button class="export-dropdown__btn" type="button" disabled={!canExport} onClick={() => handleExport('copy')}>
        Copy
      </button>
      <button class="export-dropdown__btn" type="button" disabled={!canExport} onClick={() => handleExport('download')}>
        Download
      </button>
      {message && (
        <p class="export-dropdown__message" role="status" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  );
}
