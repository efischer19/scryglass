# Ticket 18: Web App Manifest

## What do you want to build?

Create a `manifest.json` file that enables "Add to Home Screen" functionality, making Scryglass feel like a native app when launched from a mobile device's home screen.

## Acceptance Criteria

- [ ] A `src/manifest.json` file is created with valid Web App Manifest fields
- [ ] `name` is set to `Scryglass`
- [ ] `short_name` is set to `Scryglass`
- [ ] `description` describes the app's purpose
- [ ] `start_url` is set to `./index.html`
- [ ] `display` is set to `standalone` (hides browser chrome for a native-app feel)
- [ ] `orientation` is set to `any` (allows both landscape and portrait — players choose)
- [ ] `theme_color` and `background_color` are set to appropriate values matching the app's CSS
- [ ] At least one icon is provided in `src/assets/` at 192x192 and 512x512 sizes (can be a simple placeholder/generated icon)
- [ ] The manifest is linked in `src/index.html` via `<link rel="manifest" href="manifest.json">`
- [ ] A `<meta name="theme-color">` tag is added to `src/index.html`
- [ ] The app can be installed as a PWA from Chrome/Edge's "Install App" prompt (manual verification)

## Implementation Notes (Optional)

A minimal `manifest.json`:

```json
{
  "name": "Scryglass",
  "short_name": "Scryglass",
  "description": "Virtual shuffler and library manager for Magic: The Gathering",
  "start_url": "./index.html",
  "display": "standalone",
  "orientation": "any",
  "theme_color": "#1a1a2e",
  "background_color": "#1a1a2e",
  "icons": [
    { "src": "assets/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "assets/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Icons can be generated from a simple SVG or placeholder. A crystal ball or scrying orb motif would fit the brand.

**References:** Ticket 05 (UI Shell — the HTML where the manifest link goes)
