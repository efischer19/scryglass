import { useState, useEffect } from 'preact/hooks';

type Route = '#/input' | '#/app';

const VALID_ROUTES = new Set<string>(['#/input', '#/app']);

function getRoute(): Route {
  const hash = window.location.hash;
  return VALID_ROUTES.has(hash) ? (hash as Route) : '#/input';
}

interface RouterProps {
  inputView: preact.ComponentChild;
  appView: preact.ComponentChild;
}

export function Router({ inputView, appView }: RouterProps) {
  const [route, setRoute] = useState<Route>(getRoute);

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <div aria-live="polite">
      {route === '#/input' ? inputView : appView}
    </div>
  );
}

export function navigate(route: Route): void {
  window.location.hash = route;
}
