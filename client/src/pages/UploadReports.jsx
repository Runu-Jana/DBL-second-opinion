import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../i18n.jsx';

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
const check = <svg viewBox="0 0 24 24" width="18" height="18" {...s}><path d="m5 12 4 4L19 6" /></svg>;
const NextIcon = [
  <svg viewBox="0 0 24 24" width="24" height="24" {...s}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /></svg>,
  <svg viewBox="0 0 24 24" width="24" height="24" {...s}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5" /><circle cx="17" cy="9" r="2.5" /><path d="M13.5 20c.4-2.6 2-4 3.5-4s3.1 1.4 3.5 4" /></svg>,
  <svg viewBox="0 0 24 24" width="24" height="24" {...s}><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>,
  <svg viewBox="0 0 24 24" width="24" height="24" {...s}><path d="M20 12a7 7 0 0 1-7 7H7l-3 2 1-3.5A7 7 0 1 1 20 12Z" /></svg>,
];

export default function UploadReports() {
  const { requestUpload } = useAuth();
  const { t } = useLang();

  return (
    <>
      <Header active="patients" />

      <section className="upl-banner">
        <div className="container upl-banner-inner">
          <div>
            <nav className="breadcrumb"><Link to="/">{t('nav.home')}</Link> <span>›</span> {t('upl.title')}</nav>
            <h1>{t('upl.title')}</h1>
            <p>{t('upl.sub')}</p>
          </div>
          <span className="upl-banner-art" aria-hidden="true">
            <svg viewBox="0 0 120 100" width="150" height="125">
              <rect x="6" y="30" width="52" height="60" rx="6" fill="#d0efec" stroke="#0e9f8e" strokeWidth="2" />
              <path d="M18 46h28M18 56h28M18 66h20" stroke="#0e9f8e" strokeWidth="2" strokeLinecap="round" />
              <circle cx="82" cy="52" r="30" fill="#0e9f8e" />
              <path d="M82 64V42m0 0-8 8m8-8 8 8" stroke="#fff" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="104" cy="74" r="14" fill="#0b7d70" />
              <path d="m98 74 4 4 8-8" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </section>

      <section className="upl-main">
        <div className="container upl-grid">
          <div className="upl-drop" role="button" tabIndex={0} onClick={requestUpload}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') requestUpload(); }}>
            <span className="upl-drop-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="44" height="44" {...s}><path d="M12 16V6m0 0-4 4m4-4 4 4" /><path d="M5 15v2.5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5V15" /></svg>
            </span>
            <p className="upl-drop-title">{t('upl.drop')}</p>
            <span className="upl-or">{t('upl.or')}</span>
            <span className="btn btn-primary">{t('upl.choose')}</span>
            <p className="upl-formats">{t('upl.formats')}</p>
            <p className="upl-safe"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg> {t('upl.safe')}</p>
          </div>

          <aside className="upl-side">
            <div className="upl-card">
              <h3>{t('upl.tipsTitle')}</h3>
              <ul>{[1, 2, 3, 4].map((i) => <li key={i}>{check} {t(`upl.tip${i}`)}</li>)}</ul>
            </div>
            <div className="upl-card">
              <h3>{t('upl.recTitle')}</h3>
              <ul className="upl-recommend">{[1, 2, 3, 4, 5].map((i) => <li key={i}><span className="upl-dot" />{t(`upl.rec${i}`)}</li>)}</ul>
            </div>
          </aside>
        </div>

        <div className="container">
          <div className="section-head left"><h2>{t('upl.nextTitle')}</h2></div>
          <div className="upl-next">
            {[1, 2, 3, 4].map((i) => (
              <div className="upl-next-item" key={i}>
                <span className="upl-next-icon">{NextIcon[i - 1]}</span>
                <h4>{t(`upl.n${i}t`)}</h4>
                <p>{t(`upl.n${i}d`)}</p>
                {i < 4 && <span className="upl-next-arrow" aria-hidden="true">→</span>}
              </div>
            ))}
          </div>

          <div className="upl-privacy">
            <div className="upl-privacy-item">
              <span className="upl-privacy-icon"><svg viewBox="0 0 24 24" width="24" height="24" {...s}><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg></span>
              <div><strong>{t('upl.priv1t')}</strong><span>{t('upl.priv1d')}</span></div>
            </div>
            <div className="upl-privacy-item">
              <span className="upl-privacy-icon"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg></span>
              <div><strong>{t('upl.priv2t')}</strong><span>{t('upl.priv2d')}</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="upl-help">
        <div className="container upl-help-grid">
          <div>
            <strong>{t('upl.helpT')}</strong>
            <span>{t('upl.helpD')}</span>
            <a href="/#contact" className="btn btn-light">{t('upl.helpBtn')}</a>
          </div>
          <div>
            <strong>{t('upl.trustT')}</strong>
            <span>{t('upl.trustD')}</span>
            <Link to="/how-it-works" className="btn btn-light">{t('upl.trustBtn')}</Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
