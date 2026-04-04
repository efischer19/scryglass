import { describe, it, expect } from 'vitest';

describe('@scryglass/core', () => {
  it('should be importable', async () => {
    const core = await import('./index.js');
    expect(core).toBeDefined();
  });
});
