import { useCallback, useEffect, useRef, useState } from 'react';

/* Loads the data a screen needs.

   status: 'loading' | 'ready' | 'error'
   slow:   only turns true if loading takes longer than 250ms, so fast
           responses don't flash a loading screen
   reload: try again from scratch (shows the loading state)
   refresh: re-fetch quietly and swap the data in (after a delete, etc.) */
export function useLoad(loader, deps) {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', data: null, error: null });
    setSlow(false);
    const timer = setTimeout(() => { if (!cancelled) setSlow(true); }, 250);

    loaderRef.current()
      .then(
        (data) => { if (!cancelled) setState({ status: 'ready', data, error: null }); },
        (error) => {
          if (cancelled) return;
          // A missing trail is an expected outcome (shows "not found"), so it's only a warning
          if (error.status === 404) console.warn('[useLoad] Not found:', error.message);
          else console.error('[useLoad] Loading failed:', error);
          setState({ status: 'error', data: null, error });
        },
      )
      .finally(() => clearTimeout(timer));

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [...deps, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const refresh = useCallback(async () => {
    const data = await loaderRef.current();
    setState({ status: 'ready', data, error: null });
  }, []);

  return { ...state, slow, reload, refresh };
}
