/** Loads the model catalogue and periodically refreshes availability. */
import { useCallback, useEffect, useState } from 'react';
import { listModels } from '../api/imageApi.js';
import { MODELS_REFRESH_MS } from '../config.js';

export function useModels() {
  const [state, setState] = useState({ models: [], runtime: null, loading: true, error: null });

  const load = useCallback(async (signal) => {
    try {
      const data = await listModels(signal);
      setState({ models: data.models, runtime: data.runtime, loading: false, error: null });
    } catch (err) {
      if (err.name === 'AbortError') return;
      setState((prev) => ({ ...prev, loading: false, error: err }));
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    const timer = setInterval(() => load(controller.signal), MODELS_REFRESH_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [load]);

  return { ...state, reload: () => load() };
}
