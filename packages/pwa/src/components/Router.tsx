import { useEffect, useState } from 'preact/hooks';

type HashRoute = '#/input' | '#/editor' | '#/app';

type Route =
  | { kind: 'page'; page: HashRoute }
  | { kind: 'match'; roomCode: string };

const VALID_ROUTES = new Set<HashRoute>(['#/input', '#/editor', '#/app']);
const MATCH_ROUTE_PATTERN = /^\/match\/([A-Za-z0-9]{1,32})\/?$/;

function getRouteLabel(route: Route): string {
  if (route.kind === 'match') {
    return `Match ${route.roomCode}`;
  }

  return {
    '#/input': 'Deck Input',
    '#/editor': 'Deck Editor',
    '#/app': 'Game',
  }[route.page];
}

function getRoute(): Route {
  const match = window.location.pathname.match(MATCH_ROUTE_PATTERN);
  if (match) {
    return {
      kind: 'match',
      roomCode: match[1].toUpperCase(),
    };
  }

  const hash = window.location.hash;
  return {
    kind: 'page',
    page: VALID_ROUTES.has(hash as HashRoute) ? hash as HashRoute : '#/input',
  };
}

interface RouterProps {
  inputView: preact.ComponentChild;
  editorView: preact.ComponentChild;
  appView: preact.ComponentChild;
  matchView?: (roomCode: string) => preact.ComponentChild;
}

export function Router({ inputView, editorView, appView, matchView }: RouterProps) {
  const [route, setRoute] = useState<Route>(getRoute);
  const [announcement, setAnnouncement] = useState(`Navigated to ${getRouteLabel(getRoute())}`);

  useEffect(() => {
    const syncRoute = () => setRoute(getRoute());
    window.addEventListener('hashchange', syncRoute);
    window.addEventListener('popstate', syncRoute);
    return () => {
      window.removeEventListener('hashchange', syncRoute);
      window.removeEventListener('popstate', syncRoute);
    };
  }, []);

  useEffect(() => {
    const label = getRouteLabel(route);
    setAnnouncement(`Navigated to ${label}`);
    document.title = `${label} — Scryglass`;

    const main = document.getElementById('main-content');
    if (main) {
      main.tabIndex = -1;
      main.focus();
    }
  }, [route]);

  let view: preact.ComponentChild;
  if (route.kind === 'match') {
    view = matchView ? matchView(route.roomCode) : inputView;
  } else if (route.page === '#/editor') {
    view = editorView;
  } else if (route.page === '#/app') {
    view = appView;
  } else {
    view = inputView;
  }

  return (
    <>
      <div class="sr-only" role="status" aria-live="assertive" aria-atomic="true">
        {announcement}
      </div>
      <div aria-label="Application view">
        {view}
      </div>
    </>
  );
}

export function navigate(route: HashRoute): void {
  window.location.hash = route;
}

export function navigateToMatch(roomCode: string): void {
  window.history.pushState({}, '', `/match/${roomCode}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function navigateHome(): void {
  window.history.pushState({}, '', '/');
  window.location.hash = '#/input';
}
