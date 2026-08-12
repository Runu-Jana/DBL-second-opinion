import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import LeadPopup from '../components/LeadPopup.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../i18n.jsx';
import { api, rupees } from '../api.js';
import { ServiceIcon } from '../lib/icons.jsx';

const I = {
  cloud: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4m0 0-4 4m4-4 4 4" /><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg>,
  clipboard: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4V3h6v1" /><path d="M9 10h6M9 14h4" /></svg>,
  shield: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg>,
  globe: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9S14.5 18.5 12 21C9.5 18.5 8.2 15.3 8.2 12S9.5 5.5 12 3Z" /></svg>,
  experts: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5" /><circle cx="17" cy="9" r="2.5" /><path d="M13.5 20c.4-2.6 2-4 3.5-4s3.1 1.4 3.5 4" /></svg>,
  clock: <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  cases: <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="9" r="3" /><path d="M2 20c0-3.3 2.7-5 6-5s6 1.7 6 5" /><circle cx="17" cy="10" r="2.4" /><path d="M14.5 20c.3-2.4 1.7-3.6 2.9-3.6" /></svg>,
  doctor: <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="7" r="3.2" /><path d="M6 21c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><path d="M12 10.2v3" /></svg>,
  heartcheck: <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10Z" /><path d="m9.5 11 1.8 1.8L15 9" /></svg>,
};

const STATS = [
  { icon: I.globe, num: '20+', key: 'countries' },
  { icon: I.cases, num: '50,000+', key: 'cases' },
  { icon: I.doctor, num: '100+', key: 'experts' },
  { icon: I.heartcheck, num: '98%', key: 'satisfaction' },
  { icon: I.clock, num: '24–48 Hrs', key: 'delivery' },
];
const WHY = [I.experts, I.shield, I.clock, I.shield, I.doctor, I.globe];
const STEPS = ['1', '2', '3'];

/* Shown when the API has no services yet (or is unreachable) — mirrors the seeded catalogue. */
export const FALLBACK_SERVICES = [
  { id: 1, title: 'Cancer Medical Second Opinion', icon: 'report', price: 2999, description: 'Expert opinion on your diagnosis and treatment plan.', featured: true },
  { id: 2, title: 'Clinical Oncology Pharmacy Review', icon: 'pill', price: 999, description: 'Medication review by clinical oncology experts.' },
  { id: 3, title: 'Multidisciplinary Tumour Board', icon: 'board', price: 12999, description: 'Case review by multiple cancer specialists together.', featured: true },
  { id: 4, title: 'Video Consultation', icon: 'video', price: 1499, description: 'Discuss your case with experts over a video call.' },
  { id: 5, title: 'Patient Assistance Services', icon: 'heart', price: 4999, description: 'Hospital selection, appointment booking & care coordination.' },
  { id: 6, title: 'Treatment Plan Review', icon: 'plan', price: 2999, description: 'A thorough review of your current treatment plan.' },
  { id: 7, title: 'Chemotherapy Review', icon: 'chemo', price: 1499, description: 'Chemotherapy medicines review and expert guidance.' },
  { id: 8, title: 'Side-Effect Management', icon: 'shield', price: 1499, description: 'Management strategies for treatment side effects.' },
  { id: 9, title: 'Nationwide Patient Assistance', icon: 'globe', price: 4999, description: 'Complete support for patients across the country.' },
  { id: 10, title: 'Dedicated Care Manager', icon: 'manager', price: 9999, priceUnit: '/month', description: 'A personal care manager for complete, ongoing support.' },
];

export default function Home() {
  const { requestUpload } = useAuth();
  const { t } = useLang();
  const [services, setServices] = useState(FALLBACK_SERVICES);

  useEffect(() => { api('/services', { auth: false }).then((d) => { if (Array.isArray(d)) setServices(d); }).catch(() => {}); }, []);

  return (
    <>
      <Header active="home" />

      {/* HERO — full-bleed photo background */}
      <section className="hero" id="home">
        <div className="hero-bg-photo" aria-hidden="true">
          <picture>
            {/* portrait doctor image on phones/tablets; the wide photo on desktop */}
            <source media="(max-width:900px)" srcSet="/hero-mobile.jpg" />
            <img src="/hero.png" alt="" />
          </picture>
        </div>
        <div className="hero-overlay" aria-hidden="true" />

        <div className="container hero-container">
          <div className="hero-copy">
            <p className="hero-eyebrow"><span className="eyebrow-line" /> {t('hero.eyebrow')}</p>
            <h1>{t('hero.h1a')}<br /><span className="accent">{t('hero.h1b')}</span></h1>
            <p className="hero-sub">{t('hero.sub')}</p>

            <div className="hero-actions">
              <Link className="btn btn-primary btn-stacked" to="/upload-reports">
                <span className="btn-ico">{I.cloud}</span>
                <span className="btn-lines"><strong>{t('hero.getStarted')}</strong><em>{t('hero.uploadReport')}</em></span>
              </Link>
              <Link className="btn btn-outline btn-stacked" to="/contact">
                <span className="btn-ico">{I.clipboard}</span>
                <span className="btn-lines"><strong>{t('hero.book')}</strong><em>{t('hero.talk')}</em></span>
              </Link>
            </div>

            <div className="hero-trust">
              <span className="trust-item"><span className="ti-ico">{I.shield}</span><span className="ti-label">{t('hero.trust1')}</span></span>
              <span className="trust-item"><span className="ti-ico">{I.globe}</span><span className="ti-label">{t('hero.trust2')}</span></span>
              <span className="trust-item"><span className="ti-ico">{I.experts}</span><span className="ti-label">{t('hero.trust3')}</span></span>
            </div>
          </div>
        </div>

        {/* Trust card hidden for now — flip `false` to `true` to bring it back */}
        {false && (
        <div className="hero-trust-wrap">
          <div className="container hero-trust-row">
            <div className="trust-card">
              <div className="trust-avatars" aria-hidden="true">
                {['/avatar-1.jpg', '/avatar-2.jpg', '/avatar-3.jpg', '/avatar-4.jpg', '/avatar-5.jpg'].map((src, i) => (
                  <span className="tavatar" key={i}><img src={src} alt="" loading="lazy" /></span>
                ))}
              </div>
              <div className="trust-card-text">
                <div className="stars">★★★★★</div>
                <p><strong>Trusted by 50,000+</strong><span>Happy Cancer Patients</span></p>
              </div>
            </div>
          </div>
        </div>
        )}
      </section>

      {/* STATS BAR — hidden for now; flip `false` to `true` to bring it back */}
      {false && (
      <section className="stats-bar">
        <div className="container stats-grid">
          {STATS.map((s) => (
            <div className="stat" key={s.key}>
              <span className="stat-icon">{s.icon}</span>
              <div className="stat-body">
                <strong>{s.num}</strong>
                <span className="stat-label">{t(`stats.${s.key}`)}</span>
                <em>{t(`stats.${s.key}D`)}</em>
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* WHY CHOOSE */}
      <section className="why-choose" id="why-choose">
        <div className="container">
          <div className="section-head"><h2>{t('why.title')}</h2><span className="section-underline" /></div>
          <div className="why-grid">
            {WHY.map((icon, i) => (
              <article className="why-card" key={i}>
                <span className="why-icon">{icon}</span>
                <h3>{t(`why.t${i + 1}`)}</h3>
                <p>{t(`why.d${i + 1}`)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="services" id="services">
        <div className="container">
          <div className="section-head"><h2>{t('services.title')}</h2><span className="section-underline" /></div>
          <div className="services-grid">
            {services.map((s) => (
              <article className="service-card" key={s.id}>
                {s.featured && <span className="doc-badge">Popular</span>}
                <span className="service-icon"><ServiceIcon k={s.icon} /></span>
                <h3>{s.title}</h3>
                <p>{s.description}</p>
                <p className="service-price">{t('services.from')} <strong>{rupees(s.price)}</strong>{s.priceUnit && <span className="price-unit"> {s.priceUnit}</span>}</p>
                <a className="service-link" href={`/services/${s.id}`}>{t('services.viewDetails')} &rarr;</a>
              </article>
            ))}
          </div>
          <div className="services-cta">
            <div className="cta-left">
              <span className="cta-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12a7 7 0 0 1-7 7H7l-3 2 1-3.5A7 7 0 1 1 20 12Z" /><path d="M12 8v.5M12 11v3" /></svg>
              </span>
              <div><strong>{t('services.ctaTitle')}</strong><span>{t('services.ctaSub')}</span></div>
            </div>
            <Link to="/contact" className="btn btn-primary">{t('services.ctaBtn')}</Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-light" id="how">
        <div className="container">
          <div className="section-head"><h2>{t('how.title')}</h2><span className="section-underline" /></div>
          <div className="steps-light">
            {STEPS.map((n, i) => (
              <div className="step-light" key={n}>
                <span className="step-num">{n}</span>
                <h4>{t(`how.t${i + 1}`)}</h4>
                <p>{t(`how.d${i + 1}`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <LeadPopup />
    </>
  );
}
