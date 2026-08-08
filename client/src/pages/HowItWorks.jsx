import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { useLang } from '../i18n.jsx';

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
const Icon = {
  upload: <svg viewBox="0 0 24 24" width="26" height="26" {...s}><path d="M12 16V6m0 0-3.5 3.5M12 6l3.5 3.5" /><path d="M5 15v2.5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5V15" /></svg>,
  review: <svg viewBox="0 0 24 24" width="26" height="26" {...s}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5" /><circle cx="17" cy="9" r="2.5" /><path d="M13.5 20c.4-2.6 2-4 3.5-4s3.1 1.4 3.5 4" /></svg>,
  doc: <svg viewBox="0 0 24 24" width="26" height="26" {...s}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /><path d="M9.5 12h5M9.5 15h5" /></svg>,
  plan: <svg viewBox="0 0 24 24" width="26" height="26" {...s}><path d="M20 12a7 7 0 0 1-7 7H7l-3 2 1-3.5A7 7 0 1 1 20 12Z" /><path d="M9 11h6M9 14h4" /></svg>,
  globe: <svg viewBox="0 0 24 24" width="28" height="28" {...s}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9S14.5 18.5 12 21C9.5 18.5 8.2 15.3 8.2 12S9.5 5.5 12 3Z" /></svg>,
  care: <svg viewBox="0 0 24 24" width="28" height="28" {...s}><circle cx="12" cy="8" r="3.4" /><path d="M6 20c0-3.3 2.7-5.4 6-5.4s6 2.1 6 5.4" /><path d="M12 11.4v2.2" /></svg>,
  secure: <svg viewBox="0 0 24 24" width="28" height="28" {...s}><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg>,
  support: <svg viewBox="0 0 24 24" width="28" height="28" {...s}><path d="M4 13a8 8 0 0 1 16 0" /><rect x="3" y="13" width="4" height="6" rx="1.4" /><rect x="17" y="13" width="4" height="6" rx="1.4" /><path d="M19 19a3 3 0 0 1-3 3h-2" /></svg>,
  outcome: <svg viewBox="0 0 24 24" width="28" height="28" {...s}><path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 21l-4.9 2.6.9-5.5-4-3.9 5.5-.8z" /></svg>,
};

const STEPS = [Icon.upload, Icon.review, Icon.doc, Icon.plan];
const WHY = [Icon.globe, Icon.care, Icon.secure, Icon.support, Icon.outcome];
const STAT_NUMS = ['20+', '50,000+', '100+', '98%', '24–48 Hrs'];

export default function HowItWorks() {
  const { t } = useLang();
  return (
    <>
      <Header active="how" />

      <section className="hiw-banner">
        <div className="container">
          <nav className="breadcrumb light"><Link to="/">{t('nav.home')}</Link> <span>›</span> {t('nav.how')}</nav>
          <h1>{t('hiw.title')}</h1>
          <p>{t('hiw.sub')}</p>
        </div>
      </section>

      <section className="hiw-main">
        <div className="container hiw-grid">
          <ol className="hiw-steps">
            {STEPS.map((icon, i) => (
              <li className="hiw-step" key={i}>
                <span className="hiw-step-icon">{icon}</span>
                <div className="hiw-step-body">
                  <span className="hiw-step-num">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{t(`hiw.s${i + 1}t`)}</h3>
                  <p>{t(`hiw.s${i + 1}d`)}</p>
                </div>
              </li>
            ))}
          </ol>

          <aside className="hiw-secure">
            <span className="hiw-secure-badge">{Icon.secure}</span>
            <h3>{t('hiw.secTitle')}</h3>
            <p>{t('hiw.secSub')}</p>
            <ul>
              {[1, 2, 3, 4].map((i) => (
                <li key={i}><svg viewBox="0 0 24 24" width="18" height="18" {...s}><path d="m5 12 4 4L19 6" /></svg> {t(`hiw.sec${i}`)}</li>
              ))}
            </ul>
            <span className="hiw-lock" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
            </span>
          </aside>
        </div>
      </section>

      <section className="why-choose">
        <div className="container">
          <div className="section-head"><h2>{t('hiw.whyTitle')}</h2><span className="section-underline" /></div>
          <div className="why-grid five">
            {WHY.map((icon, i) => (
              <article className="why-card" key={i}>
                <span className="why-icon">{icon}</span>
                <h3>{t(`hiw.w${i + 1}t`)}</h3>
                <p>{t(`hiw.w${i + 1}d`)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="stats-strip">
        <div className="container stats-strip-grid">
          {STAT_NUMS.map((n, i) => (
            <div className="ss-stat" key={i}><strong>{n}</strong><span>{t(`hiw.st${i + 1}`)}</span></div>
          ))}
        </div>
      </section>

      <Footer />
    </>
  );
}
