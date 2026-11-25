/** Native Fullscreen API for a container element (Escape exits via the browser). */
import { useCallback, useEffect, useState } from 'react';

export function useFullscreen(ref) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const supported = typeof document !== 'undefined' && Boolean(document.fullscreenEnabled);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === ref.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [ref]);

  const toggle = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await ref.current?.requestFullscreen();
    } catch {
      /* the browser refused (e.g. iframe without permission): stay inline */
    }
  }, [ref]);

  return { isFullscreen, toggle, supported };
}
