import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../i18n.jsx';

const FeatIcon = {
  summary: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /><path d="M9.5 12h5M9.5 15h5" /></svg>,
  drug: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" /><path d="M9.5 12l1.7 1.7L15 10" /></svg>,
  insight: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8v.3h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3Z" /></svg>,
  symptom: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l2 6 4-12 2 6h6" /></svg>,
  lang: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9S14.5 18.5 12 21C9.5 18.5 8.2 15.3 8.2 12S9.5 5.5 12 3Z" /></svg>,
};
const FEATURES = [
  { icon: FeatIcon.summary, n: 1 }, { icon: FeatIcon.drug, n: 2 }, { icon: FeatIcon.insight, n: 3 },
  { icon: FeatIcon.symptom, n: 4 }, { icon: FeatIcon.lang, n: 5 },
];
const TABS = [
  { key: 'patients', l: 'tabPatients', g: 'tagPatients' },
  { key: 'pharmacists', l: 'tabPharm', g: 'tagPharm' },
  { key: 'doctors', l: 'tabDoctors', g: 'tagDoctors' },
  { key: 'admin', l: 'tabAdmin', g: 'tagAdmin' },
];

function AiVisual() {
  const cx = 230, cy = 150, h = 46;                 // chip centre + half-size
  const L = cx - h, R = cx + h, T = cy - h, B = cy + h;
  const pinOff = [-30, -10, 10, 30];                 // connector pins per edge

  // PCB-style right-angle traces — each polyline ends at a solder pad
  const traces = [
    [[L - 8, 120], [110, 120], [110, 78], [62, 78]],
    [[L - 8, 180], [124, 180], [124, 224], [70, 224]],
    [[R + 8, 120], [352, 120], [352, 76], [402, 76]],
    [[R + 8, 180], [338, 180], [338, 222], [400, 222]],
    [[200, T - 8], [200, 56], [150, 56]],
    [[260, T - 8], [260, 46]],
    [[200, B + 8], [200, 248], [150, 248]],
    [[260, B + 8], [260, 258]],
  ];
  const dataDots = [[110, 120], [124, 205], [352, 100], [338, 205], [200, 70], [200, 232]];

  return (
    <div className="ai-visual">
      <svg viewBox="0 0 460 300" role="img" aria-label="AI processor at the centre of connected oncology systems">
        <defs>
          <radialGradient id="aiHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(92,240,218,.42)" />
            <stop offset="55%" stopColor="rgba(92,240,218,.10)" />
            <stop offset="100%" stopColor="rgba(92,240,218,0)" />
          </radialGradient>
          <radialGradient id="aiCoreFill" cx="50%" cy="38%" r="70%">
            <stop offset="0%" stopColor="#12897b" />
            <stop offset="60%" stopColor="#0b5952" />
            <stop offset="100%" stopColor="#073b35" />
          </radialGradient>
          <pattern id="aiGrid" width="22" height="22" patternUnits="userSpaceOnUse">
            <path className="ai-grid-line" d="M22 0H0V22" />
          </pattern>
        </defs>

        {/* technical grid background */}
        <rect x="0" y="0" width="460" height="300" fill="url(#aiGrid)" />

        {/* HUD corner brackets */}
        <path className="ai-hud" d="M20 42V20H42" />
        <path className="ai-hud" d="M440 42V20H418" />
        <path className="ai-hud" d="M20 258V280H42" />
        <path className="ai-hud" d="M440 258V280H418" />

        {/* circuit traces + solder pads */}
        <g>
          {traces.map((pts, i) => {
            const [px, py] = pts[pts.length - 1];
            return (
              <g key={i}>
                <polyline className="ai-trace" points={pts.map((p) => p.join(',')).join(' ')} />
                <rect className="ai-pad" x={px - 5} y={py - 5} width="10" height="10" rx="2.5" />
                <circle className="ai-pad-dot" cx={px} cy={py} r="2" />
              </g>
            );
          })}
        </g>
        {dataDots.map(([x, y], i) => <circle key={i} className="ai-data" cx={x} cy={y} r="2.6" />)}

        {/* connector pins around the chip */}
        <g className="ai-pins">
          {pinOff.map((o, i) => <rect key={'l' + i} x={L - 8} y={cy + o - 1.5} width="8" height="3" rx="1" />)}
          {pinOff.map((o, i) => <rect key={'r' + i} x={R} y={cy + o - 1.5} width="8" height="3" rx="1" />)}
          {pinOff.map((o, i) => <rect key={'t' + i} x={cx + o - 1.5} y={T - 8} width="3" height="8" rx="1" />)}
          {pinOff.map((o, i) => <rect key={'b' + i} x={cx + o - 1.5} y={B} width="3" height="8" rx="1" />)}
        </g>

        {/* processor chip */}
        <circle className="ai-chip-halo" cx={cx} cy={cy} r="66" />
        <rect className="ai-chip" x={L} y={T} width={h * 2} height={h * 2} rx="12" />
        <rect className="ai-chip-inner" x={L + 11} y={T + 11} width={h * 2 - 22} height={h * 2 - 22} rx="7" />
        <path className="ai-chip-cross" d={`M${cx} ${T + 11}V${B - 11}M${L + 11} ${cy}H${R - 11}`} />
        <text x={cx} y={cy + 1} className="ai-text" textAnchor="middle" dominantBaseline="central">AI</text>
      </svg>
    </div>
  );
}

export default function AIFeatures() {
  const { requestUpload } = useAuth();
  const { t } = useLang();
  const [tab, setTab] = useState('patients');
  const active = TABS.find((x) => x.key === tab);

  return (
    <>
      <Header active="ai" />
      <section className="ai-page">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb"><Link to="/">{t('nav.home')}</Link> <span>›</span> {t('nav.ai')}</nav>

          <div className="ai-grid">
            <div className="ai-left">
              <h1>{t('aif.title')}</h1>
              <p className="ai-sub">{t('aif.sub')}</p>
              <div className="ai-tabs" role="tablist">
                {TABS.map((tb) => (
                  <button key={tb.key} role="tab" aria-selected={tb.key === tab}
                    className={'ai-tab' + (tb.key === tab ? ' active' : '')} onClick={() => setTab(tb.key)}>
                    {t('aif.' + tb.l)}
                  </button>
                ))}
              </div>
              <p className="ai-tagline">{t('aif.' + active.g)}</p>
              <AiVisual />
            </div>

            <div className="ai-right">
              <ul className="ai-features">
                {FEATURES.map((f) => (
                  <li className="ai-feature" key={f.n}>
                    <span className="ai-feature-icon">{f.icon}</span>
                    <div><h3>{t(`aif.f${f.n}t`)}</h3><p>{t(`aif.f${f.n}d`)}</p></div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="ai-cta">
            <div className="ai-cta-left">
              <span className="ai-cta-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
              </span>
              <div><strong>{t('aif.ctaTitle')}</strong><span>{t('aif.ctaSub')}</span></div>
            </div>
            <button className="btn" onClick={requestUpload}>{t('aif.ctaBtn')}</button>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
