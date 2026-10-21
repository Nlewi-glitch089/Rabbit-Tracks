/* A tiny hash router. The part of the address after # picks the screen:

     #/                                  dashboard
     #/trails/new                        new trail (optional ?question=...)
     #/trails/ID                         trail + discovery path (optional ?step=ID to highlight one)
     #/trails/ID/edit                    edit trail
     #/trails/ID/discoveries/new         add discovery
     #/trails/ID/discoveries/ID/edit     edit discovery

   Hash addresses work from any static host without server config, and
   refresh + Back/Forward work. No router library needed for six screens. */

import { useEffect, useState } from 'react';

export function parseRoute(hash) {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const params = new URLSearchParams(query);

  if (parts.length === 0 || (parts.length === 1 && parts[0] === 'trails')) return { name: 'dashboard' };
  if (parts[0] !== 'trails') return { name: 'not-found' };
  if (parts.length === 2 && parts[1] === 'new') return { name: 'trail-new', question: params.get('question') || '' };

  const trailId = parts[1];
  if (parts.length === 2) return { name: 'trail', trailId, step: params.get('step') };
  if (parts.length === 3 && parts[2] === 'edit') return { name: 'trail-edit', trailId };
  if (parts[2] === 'discoveries') {
    if (parts.length === 4 && parts[3] === 'new') return { name: 'discovery-new', trailId };
    if (parts.length === 5 && parts[4] === 'edit') return { name: 'discovery-edit', trailId, discoveryId: parts[3] };
  }
  return { name: 'not-found' };
}

export const links = {
  dashboard: () => '#/',
  newTrail: (question) => (question ? `#/trails/new?question=${encodeURIComponent(question)}` : '#/trails/new'),
  trail: (trailId, stepId) =>
    `#/trails/${encodeURIComponent(trailId)}${stepId ? `?step=${encodeURIComponent(stepId)}` : ''}`,
  editTrail: (trailId) => `#/trails/${encodeURIComponent(trailId)}/edit`,
  newDiscovery: (trailId) => `#/trails/${encodeURIComponent(trailId)}/discoveries/new`,
  editDiscovery: (trailId, discoveryId) =>
    `#/trails/${encodeURIComponent(trailId)}/discoveries/${encodeURIComponent(discoveryId)}/edit`,
};

export function navigate(hash) {
  window.location.hash = hash;
}

// Cancel/Back go to where the user came from, but only if that was the dashboard or a trail
export function backTarget(previous, fallback) {
  if (!previous) return fallback;
  const { name } = parseRoute(previous);
  return name === 'dashboard' || name === 'trail' ? previous : fallback;
}

// Returns { route, previous }. `previous` is the hash the user came from, for Cancel/Back links.
export function useHashRoute() {
  const [state, setState] = useState(() => ({ hash: window.location.hash || '#/', previous: null }));

  useEffect(() => {
    function onChange(event) {
      setState({ hash: window.location.hash || '#/', previous: new URL(event.oldURL).hash || '#/' });
    }
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return { hash: state.hash, route: parseRoute(state.hash), previous: state.previous };
}
