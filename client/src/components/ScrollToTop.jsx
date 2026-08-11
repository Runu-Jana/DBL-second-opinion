import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/* Resets the scroll position on navigation so every page opens from the top.
   If the URL carries a hash (e.g. /#contact), scroll to that element instead. */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) { el.scrollIntoView({ behavior: 'smooth' }); return; }
    }
    // 'instant' bypasses the global `scroll-behavior:smooth`, so a new page appears at the
    // top immediately instead of animating a scroll up.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash]);

  return null;
}
