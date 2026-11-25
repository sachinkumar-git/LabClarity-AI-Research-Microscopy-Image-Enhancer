/** Data-fetching hooks: one-shot loading and polling until a condition is met. */
import { useCallback, useEffect, useRef, useState } from 'react';

/** Loads data once per `key` change. Returns { data, error, loading, reload, setData }. */
export function useApi(fetcher, key) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async (signal) => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await fetcherRef.current(signal);
      setState({ data, error: null, loading: false });
    } catch (err) {
      if (err.name !== 'AbortError') setState((s) => ({ ...s, error: err, loading: false }));
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load, key]);

  const setData = useCallback((data) => setState((s) => ({ ...s, data })), []);
  return { ...state, reload: () => load(), setData };
}

/** Polls `fetcher` every `interval` ms until `isDone(data)`; transient errors are retried. */
export function usePolling(fetcher, key, { interval = 1500, isDone = () => false } = {}) {
  const [state, setState] = useState({ data: null, error: null });
  const fetcherRef = useRef(fetcher);
  const doneRef = useRef(isDone);
  fetcherRef.current = fetcher;
  doneRef.current = isDone;

  useEffect(() => {
    if (!key) return undefined;
    const controller = new AbortController();
    let timer;
    let failures = 0;
    const tick = async () => {
      try {
        const data = await fetcherRef.current(controller.signal);
        failures = 0;
        setState({ data, error: null });
        if (!doneRef.current(data)) timer = setTimeout(tick, interval);
      } catch (err) {
        if (err.name === 'AbortError') return;
        failures += 1;
        if (err.status === 404 || failures >= 5) setState((s) => ({ ...s, error: err }));
        else timer = setTimeout(tick, interval * 2);
      }
    };
    tick();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [key, interval]);

  return state;
}
