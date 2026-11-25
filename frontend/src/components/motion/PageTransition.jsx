/** Route transitions: the outgoing page fades out, the incoming page fades and rises in. */
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { EASE } from './Reveal.jsx';

export function PageTransition({ children }) {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) window.scrollTo({ top: 0 });
  }, [location.pathname, location.hash]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } }}
        exit={{ opacity: 0, y: -6, transition: { duration: 0.16, ease: 'easeIn' } }}
      >
        {children(location)}
      </motion.div>
    </AnimatePresence>
  );
}
