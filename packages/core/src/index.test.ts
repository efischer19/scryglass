import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, join, extname } from 'node:path';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('@scryglass/core', () => {
  it('should be importable', async () => {
    const core = await import('./index.js');
    expect(core).toBeDefined();
  });

  it('exports all expected public API members', async () => {
    const core = await import('./index.js');

    // Shuffle engine
    expect(typeof core.cryptoRandomInt).toBe('function');
    expect(typeof core.shuffle).toBe('function');

    // CSV parser
    expect(typeof core.parseDeck).toBe('function');

    // Schemas
    expect(core.CardSchema).toBeDefined();
    expect(core.GameStateSchema).toBeDefined();
    expect(core.ActionSchema).toBeDefined();
    expect(core.ActionResultSchema).toBeDefined();
    expect(core.MulliganVerdictSchema).toBeDefined();

    // State management
    expect(typeof core.createInitialState).toBe('function');
    expect(typeof core.dispatch).toBe('function');

    // Mulligan
    expect(typeof core.countLands).toBe('function');
    expect(typeof core.getMulliganVerdict).toBe('function');

    // Helpers
    expect(typeof core.peekTop).toBe('function');
    expect(typeof core.getBasicLandCounts).toBe('function');
    expect(typeof core.searchLibrary).toBe('function');
  });
});

describe('@scryglass/core — agent-ready architecture', () => {
  /**
   * Recursively collect all .ts source files (excluding tests and declarations)
   * from the core package.
   */
  function collectSourceFiles(dir: string): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        files.push(...collectSourceFiles(full));
      } else if (
        extname(full) === '.ts' &&
        !full.endsWith('.test.ts') &&
        !full.endsWith('.d.ts')
      ) {
        files.push(full);
      }
    }
    return files;
  }

  const sourceFiles = collectSourceFiles(__dirname);

  it('has no DOM/Browser API imports in any source file', () => {
    // Patterns that indicate actual browser API usage (not game terms like "fetch land")
    const browserPatterns: Array<{ label: string; regex: RegExp }> = [
      { label: 'window.', regex: /\bwindow\s*\./ },
      { label: 'document.', regex: /\bdocument\s*\./ },
      { label: 'navigator.', regex: /\bnavigator\s*\./ },
      { label: 'localStorage', regex: /\blocalStorage\s*\./ },
      { label: 'sessionStorage', regex: /\bsessionStorage\s*\./ },
      { label: 'fetch(', regex: /\bfetch\s*\(/ },
      { label: 'XMLHttpRequest', regex: /\bXMLHttpRequest\b/ },
      { label: 'HTMLElement', regex: /\bHTMLElement\b/ },
      { label: 'addEventListener', regex: /\baddEventListener\s*\(/ },
      { label: 'import from DOM lib', regex: /from\s+['"](?:react|preact|react-dom)['"]/ },
    ];
    const violations: string[] = [];

    for (const file of sourceFiles) {
      const content = readFileSync(file, 'utf-8');
      const relativePath = file.replace(__dirname + '/', '');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Skip comments
        if (line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) continue;

        for (const { label, regex } of browserPatterns) {
          if (regex.test(line)) {
            violations.push(`${relativePath}:${i + 1} uses '${label}': ${line}`);
          }
        }
      }
    }

    expect(violations, `Core module has browser dependencies:\n${violations.join('\n')}`).toEqual([]);
  });

  it('uses only JSON-serializable types in action/state schemas', async () => {
    const core = await import('./index.js');

    // Verify that a round-trip through JSON produces identical state
    const initialState = core.createInitialState();
    const roundTripped = JSON.parse(JSON.stringify(initialState));
    expect(roundTripped).toEqual(initialState);
  });

  it('dispatch returns JSON-serializable results', async () => {
    const core = await import('./index.js');

    const state = core.createInitialState();
    const cards = Array.from({ length: 10 }, (_, i) => ({
      name: `Card ${i}`,
      setCode: 'TST',
      collectorNumber: String(i),
      cardType: i < 4 ? 'land' as const : 'nonland' as const,
    }));

    const result = core.dispatch(state, {
      type: 'LOAD_DECK',
      payload: { player: 'A', cards },
    });

    // Result should survive JSON serialization
    const roundTripped = JSON.parse(JSON.stringify(result));
    expect(roundTripped).toEqual(result);
  });

  it('produces descriptive error messages for invalid actions', async () => {
    const core = await import('./index.js');

    const state = core.createInitialState();

    // Drawing from empty library should produce a descriptive error
    expect(() =>
      core.dispatch(state, { type: 'DRAW_CARD', payload: { player: 'A' } }),
    ).toThrow(/Player A.*library is empty/);

    // Invalid action schema should throw a Zod validation error
    expect(() =>
      core.dispatch(state, { type: 'INVALID_ACTION' } as never),
    ).toThrow();
  });
});
