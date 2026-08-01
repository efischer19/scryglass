import { useDarkMode } from '../utils/useDarkMode.js';

export function ThemeToggle() {
  const { isDark, toggle } = useDarkMode();

  return (
    <button
      class="theme-toggle"
      onClick={toggle}
      type="button"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
