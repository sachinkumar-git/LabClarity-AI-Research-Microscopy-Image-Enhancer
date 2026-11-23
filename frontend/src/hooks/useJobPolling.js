/** Polls a job until it reaches a terminal state (completed / failed). */
import { useEffect, useState } from 'react';
import { getJob } from '../api/imageApi.js';
import { POLL_INTERVAL_MS } from '../config.js';

const TERMINAL = new Set(['completed', 'failed']);
const MAX_CONSECUTIVE_ERRORS = 5;

export function useJobPolling(jobId, initialJob = null) {
  const [job, setJob] = useState(initialJob);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setError(null);
      return undefined;
    }
    const controller = new AbortController();
    let timer;
    let failures = 0;

    async function tick() {
      try {
        const next = await getJob(jobId, controller.signal);
        failures = 0;
        setJob(next);
        setError(null);
        if (!TERMINAL.has(next.status)) timer = setTimeout(tick, POLL_INTERVAL_MS);
      } catch (err) {
        if (err.name === 'AbortError') return;
        failures += 1;
        // A 404 is final (job expired or deleted); transient errors are retried.
        if (err.status === 404 || failures >= MAX_CONSECUTIVE_ERRORS) setError(err);
        else timer = setTimeout(tick, POLL_INTERVAL_MS * 2);
      }
    }

    tick();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [jobId]);

  return { job, error };
}
