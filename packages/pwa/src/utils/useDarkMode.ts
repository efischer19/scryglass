import { useEffect, useState } from 'preact/hooks';

const THEME_STORAGE_KEY = 'scryglass-theme';
const THEME_LIGHT = 'light';
const THEME_DARK = 'dark';

/**
 * Determines the initial theme based on user preference and system settings.
 * Priority: localStorage > system preference > light (default)
 */
function getInitialTheme(): typeof THEME_LIGHT | typeof THEME_DARK {
  // Check localStorage first
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === THEME_LIGHT || stored === THEME_DARK) {
    return stored;
  }

  // Check system preference if matchMedia is available
  if (typeof window !== 'undefined' && window.matchMedia) {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return THEME_DARK;
    }
  }

  return THEME_LIGHT;
}

/**
 * Applies the theme to the document element.
 */
function applyTheme(theme: typeof THEME_LIGHT | typeof THEME_DARK) {
  const html = document.documentElement;
  html.setAttribute('data-theme', theme);
}

/**
 * Custom Preact hook for managing dark mode.
 * Reads system preference on initial load and allows toggling with localStorage persistence.
 *
 * @returns Object with `isDark` boolean and `toggle` function
 */
export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => getInitialTheme() === THEME_DARK);

  // Apply theme on initial load and when it changes
  useEffect(() => {
    const theme = isDark ? THEME_DARK : THEME_LIGHT;
    applyTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [isDark]);

  // Listen for system preference changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      // Only respond to system changes if user hasn't manually set a preference
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === null) {
        setIsDark(e.matches);
      }
    };

    // addEventListener returns undefined, so we need to handle both old and new API
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Fallback for older browsers (deprecated addListener)
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  const toggle = () => {
    setIsDark((prev) => !prev);
  };

  return { isDark, toggle };
}
