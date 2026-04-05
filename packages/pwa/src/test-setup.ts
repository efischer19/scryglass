import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/preact';
import { toHaveNoViolations } from 'vitest-axe/matchers';

expect.extend({ toHaveNoViolations });

afterEach(() => {
  cleanup();
});
