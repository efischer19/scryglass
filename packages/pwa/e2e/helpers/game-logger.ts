import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_RESULTS_DIR = resolve(__dirname, '..', 'test-results');

export interface GameAction {
  type: string;
  payload: Record<string, unknown>;
}

export interface GameResult {
  card?: { name: string; setCode?: string } | null;
  librarySize?: number;
  [key: string]: unknown;
}

export interface GameLogEntry {
  turn: number;
  player: string;
  action: GameAction;
  result: GameResult;
  timestamp: string;
}

/**
 * Collects structured game log entries during an E2E game simulation and
 * writes them to a JSON file in the test-results directory.
 *
 * Usage:
 *   const logger = new GameLogger('game-log.json');
 *   logger.log({ turn: 1, player: 'A', action, result });
 *   await logger.flush();
 */
export class GameLogger {
  private readonly entries: GameLogEntry[] = [];
  private readonly outputPath: string;

  constructor(filename: string) {
    this.outputPath = resolve(TEST_RESULTS_DIR, filename);
  }

  log(entry: Omit<GameLogEntry, 'timestamp'>): void {
    this.entries.push({ ...entry, timestamp: new Date().toISOString() });
  }

  flush(): void {
    mkdirSync(TEST_RESULTS_DIR, { recursive: true });
    writeFileSync(this.outputPath, JSON.stringify(this.entries, null, 2), 'utf-8');
  }
}
