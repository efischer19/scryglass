import { useState, useEffect } from 'preact/hooks';

type Route = '#/input' | '#/editor' | '#/app';

const VALID_ROUTES = new Set<string>(['#/input', '#/editor', '#/app']);

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

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  let view: preact.ComponentChild;
  if (route === '#/editor') {
    view = editorView;
  } else if (route === '#/app') {
    view = appView;
  } else {
    view = inputView;
  }

  return (
    <div aria-live="polite" aria-label="Application view">
      {view}
    </div>
  );
}

export function navigate(route: Route): void {
  window.location.hash = route;
}
