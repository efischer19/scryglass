import type { Card } from './schemas/card.js';
import { collapseCards, sortForExport } from './export-utils.js';

const CSV_HEADERS = ['Count', 'Name', 'Edition', 'Collector Number', 'Board'];

function quoteCsv(value: string): string {
  if (!/[",\r\n]/.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '""')}"`;
}

function boardFor(cardType: Card['cardType']): string {
  if (cardType === 'commander') return 'commanders';
  return 'mainboard';
}

export function exportMoxfield(cards: Card[], commanders: Card[] = []): string {
  const all = sortForExport(cards, commanders);
  const groups = collapseCards(all);
  const lines = [CSV_HEADERS.join(',')];

  for (const { card, quantity } of groups) {
    lines.push(
      [
        String(quantity),
        quoteCsv(card.name),
        quoteCsv(card.setCode.toUpperCase()),
        quoteCsv(card.collectorNumber),
        quoteCsv(boardFor(card.cardType)),
      ].join(','),
    );
  }

  return lines.join('\n');
}
