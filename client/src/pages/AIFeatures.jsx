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
              <div className="ai-role-visual">
                <img key={tab} src={`/ai/${tab}.jpg`} width="1200" height="675" loading="lazy"
                  alt={`${t('aif.' + active.l)} — how DBL's AI helps`} />
              </div>
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
