import { useState, useEffect } from 'preact/hooks';

type Route = '#/input' | '#/editor' | '#/app';

const VALID_ROUTES = new Set<string>(['#/input', '#/editor', '#/app']);

const ROUTE_LABELS: Record<Route, string> = {
  '#/input': 'Deck Input',
  '#/editor': 'Deck Editor',
  '#/app': 'Game',
};

function getRoute(): Route {
  const hash = window.location.hash;
  return VALID_ROUTES.has(hash) ? (hash as Route) : '#/input';
}

interface RouterProps {
  inputView: preact.ComponentChild;
  editorView: preact.ComponentChild;
  appView: preact.ComponentChild;
}

export function Router({ inputView, editorView, appView }: RouterProps) {
  const [route, setRoute] = useState<Route>(getRoute);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const label = ROUTE_LABELS[route];
    setAnnouncement(`Navigated to ${label}`);
    document.title = `${label} — Scryglass`;

    const main = document.getElementById('main-content');
    if (main) {
      main.setAttribute('tabindex', '-1');
      main.focus();
    }
  }, [route]);

  let view: preact.ComponentChild;
  if (route === '#/editor') {
    view = editorView;
  } else if (route === '#/app') {
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

export function navigate(route: Route): void {
  window.location.hash = route;
}
