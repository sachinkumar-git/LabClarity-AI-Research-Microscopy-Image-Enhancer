/** Keeps the active job id in the URL (?job=...) so results survive reloads and can be shared. */
import { useCallback, useEffect, useState } from 'react';

const PARAM = 'job';
const readParam = () => new URLSearchParams(window.location.search).get(PARAM);

export function useJobParam() {
  const [jobId, setJobIdState] = useState(readParam);

  useEffect(() => {
    const onPop = () => setJobIdState(readParam());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const setJobId = useCallback((id) => {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set(PARAM, id);
    else url.searchParams.delete(PARAM);
    window.history.pushState({}, '', url);
    setJobIdState(id);
  }, []);

  return [jobId, setJobId];
}
