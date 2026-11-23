/** Creates (and revokes) a blob URL for a local File so it can be previewed. */
import { useEffect, useState } from 'react';

export function useObjectUrl(file, enabled = true) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!file || !enabled) {
      setUrl(null);
      return undefined;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file, enabled]);

  return url;
}
