// Shared service icon set — maps an icon key to inline SVG (JSX)
const PATHS = {
  report: <><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4V3h6v1" /><path d="M9 10h6M9 14h4" /></>,
  pill: <><rect x="3" y="9" width="10" height="6" rx="3" transform="rotate(45 8 12)" /><path d="M8.5 8.5 12 12" /></>,
  board: <><circle cx="12" cy="7" r="2.5" /><circle cx="5.5" cy="13" r="2" /><circle cx="18.5" cy="13" r="2" /><path d="M12 9.5V13M9.5 13h5M5.5 15v3M18.5 15v3M12 13v5" /></>,
  video: <><rect x="3" y="6" width="12" height="12" rx="2" /><path d="m15 10 6-3v10l-6-3z" /></>,
  heart: <path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10Z" />,
  plan: <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /><path d="M10 12h5M10 15h5" /></>,
  chemo: <><path d="M12 3c2.5 3.5 4.5 6 4.5 8.5a4.5 4.5 0 0 1-9 0C7.5 9 9.5 6.5 12 3Z" /><path d="M10 18h4" /></>,
  shield: <><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" /><path d="M12 8v4M10 10h4" /></>,
  globe: <><circle cx="12" cy="10" r="7" /><path d="M5 10h14M12 3c2 2.2 3 4.6 3 7s-1 4.8-3 7c-2-2.2-3-4.6-3-7s1-4.8 3-7Z" /><path d="M9 20h6" /></>,
  manager: <><circle cx="12" cy="8" r="3.4" /><path d="M6 20c0-3.3 2.7-5.4 6-5.4s6 2.1 6 5.4" /><path d="m17.5 5 1.2 1.2L21 4" /></>,
  stethoscope: <><path d="M6 3v5a4 4 0 0 0 8 0V3" /><path d="M10 12v3a5 5 0 0 0 10 0v-2" /><circle cx="20" cy="12" r="1.6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
};

export const SERVICE_ICON_KEYS = Object.keys(PATHS);

export function ServiceIcon({ k = 'report', size = 24 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {PATHS[k] || PATHS.report}
    </svg>
  );
}
