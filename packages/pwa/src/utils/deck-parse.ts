import type { Card } from '@scryglass/core';

export function parseCommandersFromScryglassText(input: string): Card[] {
  const commanders: Card[] = [];
  const lines = input.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === '') continue;

    const columns = line.split(';');
    if (columns.length < 4) continue;

    const name = columns[0].trim();
    const setCode = columns[1].trim().toLowerCase();
    const collectorNumber = columns[2].trim();
    const cardType = columns[3].trim().toLowerCase();
    const isCommander =
      name !== '' &&
      setCode !== '' &&
      collectorNumber !== '' &&
      cardType === 'commander';

    if (!isCommander) continue;
    commanders.push({ name, setCode, collectorNumber, cardType: 'commander' });
  }

  return commanders;
}
