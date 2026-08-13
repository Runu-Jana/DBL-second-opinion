import { useEffect, useRef } from 'react';

const Chevron = ({ dir }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    {dir < 0 ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 6l6 6-6 6" />}
  </svg>
);

/**
 * Horizontal scroll-snap carousel with overlay arrows on both sides and gentle
 * autoplay. Native scrolling means touch-swipe works for free on mobile.
 */
export default function Carousel({ children, className = '', label = '', autoplay = true, interval = 4500 }) {
  const trackRef = useRef(null);

  const move = (dir) => {
    const t = trackRef.current;
    if (!t) return;
    const item = t.firstElementChild;
    const style = getComputedStyle(t);
    const gap = parseFloat(style.columnGap || style.gap) || 20;
    const step = item ? item.getBoundingClientRect().width + gap : 300;
    const maxLeft = t.scrollWidth - t.clientWidth;
    if (dir > 0 && t.scrollLeft >= maxLeft - 4) t.scrollTo({ left: 0, behavior: 'smooth' });          // loop to start
    else if (dir < 0 && t.scrollLeft <= 4) t.scrollTo({ left: maxLeft, behavior: 'smooth' });          // loop to end
    else t.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  useEffect(() => {
    const t = trackRef.current;
    if (!autoplay || !t || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let paused = false;
    const pause = () => { paused = true; };
    const resume = () => { paused = false; };
    t.addEventListener('pointerenter', pause);
    t.addEventListener('pointerleave', resume);
    t.addEventListener('pointerdown', pause);
    t.addEventListener('focusin', pause);
    const id = setInterval(() => { if (!paused) move(1); }, interval);
    return () => {
      clearInterval(id);
      t.removeEventListener('pointerenter', pause);
      t.removeEventListener('pointerleave', resume);
      t.removeEventListener('pointerdown', pause);
      t.removeEventListener('focusin', pause);
    };
  }, [autoplay, interval]);

  return (
    <div className={'ecarousel ' + className}>
      <button type="button" className="ecar-arrow ecar-prev" onClick={() => move(-1)} aria-label={`Previous ${label}`.trim()}><Chevron dir={-1} /></button>
      <div className="ecar-track" ref={trackRef}>{children}</div>
      <button type="button" className="ecar-arrow ecar-next" onClick={() => move(1)} aria-label={`Next ${label}`.trim()}><Chevron dir={1} /></button>
    </div>
  );
}
