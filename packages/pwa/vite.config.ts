import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, transformWithOxc, type Plugin } from 'vite';
import preact from '@preact/preset-vite';

/**
 * Vite plugin that compiles src/sw.ts into dist/sw.js at build time.
 * Injects a versioned cache name and the list of precache asset URLs
 * so the service worker can pre-cache the full app shell on install.
 */
function serviceWorkerPlugin(): Plugin {
  return {
    name: 'scryglass-service-worker',
    apply: 'build',
    async generateBundle(_options, bundle) {
      const precacheUrls = [
        '/index.html',
        '/manifest.json',
        '/assets/icon-192.png',
        '/assets/icon-512.png',
      ];

      for (const fileName of Object.keys(bundle)) {
        if (fileName.endsWith('.js') || fileName.endsWith('.css')) {
          precacheUrls.push(`/${fileName}`);
        }
      }

      const cacheVersion = Date.now().toString(36);
      const swPath = fileURLToPath(new URL('./src/sw.ts', import.meta.url));
      let swSource = readFileSync(swPath, 'utf-8');

      // Strip TypeScript-only declaration lines before injecting constants
      swSource = swSource.replace(/^\/\/\/\s*<reference\b.*\/>\s*$/gm, '');
      swSource = swSource.replace(/^declare\s+const\b.*$/gm, '');

      // Inject build-time constants before TypeScript compilation
      swSource = swSource.replace(/__APP_VERSION__/g, JSON.stringify(cacheVersion));
      swSource = swSource.replace(
        /__PRECACHE_ENTRIES__/g,
        JSON.stringify(precacheUrls)
      );

      const result = await transformWithOxc(swSource, 'sw.ts', {
        lang: 'ts',
      });

      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: result.code,
      });
    },
  };
}

export default defineConfig({
  plugins: [preact(), serviceWorkerPlugin()],
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    passWithNoTests: true,
  },
});
