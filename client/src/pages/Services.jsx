import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { useLang } from '../i18n.jsx';
import { api } from '../api.js';
import { ServiceIcon } from '../lib/icons.jsx';
import { FALLBACK_SERVICES } from './Home.jsx';

export default function Services() {
  const { t } = useLang();
  const [services, setServices] = useState(FALLBACK_SERVICES);

  useEffect(() => {
    document.title = 'Our Services — DBL International';
    api('/services', { auth: false }).then((d) => { if (Array.isArray(d)) setServices(d); }).catch(() => {});
  }, []);

  const list = services;

  return (
    <>
      <Header active="services" />

      <section className="page-banner">
        <div className="container">
          <p className="eyebrow">DBL International</p>
          <h1>{t('services.title')}</h1>
          <p className="banner-sub">{t('services.sub')}</p>
        </div>
      </section>

      <section className="services services-page" id="services">
        <div className="container">
          <div className="services-grid">
            {list.map((s) => (
              <article className="service-card" key={s.id}>
                {s.featured && <span className="doc-badge">Popular</span>}
                <span className="service-icon"><ServiceIcon k={s.icon} /></span>
                <h3>{s.title}</h3>
                <p>{s.description}</p>
                <Link className="service-link" to={`/services/${s.id}`}>{t('services.viewDetails')} &rarr;</Link>
              </article>
            ))}
          </div>

          <div className="services-cta">
            <div className="cta-left">
              <span className="cta-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.6-.8L3 21l1.8-5.9A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5Z" /><path d="M8.5 12h7M8.5 9h4" /></svg>
              </span>
              <div><strong>{t('services.ctaTitle')}</strong><span>{t('services.ctaSub')}</span></div>
            </div>
            <Link to="/contact" className="btn btn-primary">{t('services.ctaBtn')}</Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
