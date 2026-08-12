// Shared service icon set — maps an icon key to inline SVG (JSX).
// Clean, consistent line icons (Lucide-style) for a professional look.
const PATHS = {
  // Cancer Medical Second Opinion — document
  report: <><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M8 13h8M8 17h5" /></>,
  // Clinical Oncology Pharmacy Review — capsule pill
  pill: <><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" /><path d="m8.5 8.5 7 7" /></>,
  // Multidisciplinary Tumour Board — team of specialists
  board: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  // Video Consultation — camera
  video: <><path d="m22 8-6 4 6 4V8Z" /><rect x="2" y="6" width="14" height="12" rx="2.5" /></>,
  // Patient Assistance Services — heart
  heart: <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z" />,
  // Treatment Plan Review — clipboard with check
  plan: <><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="m9 14 2 2 4-4" /></>,
  // Chemotherapy Review — droplet
  chemo: <path d="M12 22a7 7 0 0 0 7-7c0-3-2.5-5.5-7-11-4.5 5.5-7 8-7 11a7 7 0 0 0 7 7Z" />,
  // Side-Effect Management — shield with plus
  shield: <><path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C15.5 3.8 18 5 20 5a1 1 0 0 1 1 1Z" /><path d="M9 12h6M12 9v6" /></>,
  // Nationwide Patient Assistance — globe
  globe: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z" /></>,
  // Dedicated Care Manager — person with check
  manager: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="m16 11 2 2 4-4" /></>,
  // stethoscope
  stethoscope: <><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" /><path d="M11 2v2M5 2v2" /><path d="M8 15a6 6 0 0 0 12 0v-3" /><circle cx="20" cy="10" r="2" /></>,
  // clock
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
};

export const SERVICE_ICON_KEYS = Object.keys(PATHS);

export function ServiceIcon({ k = 'report', size = 24 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {PATHS[k] || PATHS.report}
    </svg>
  );
}
