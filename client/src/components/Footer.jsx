import { Link } from 'react-router-dom';
import { useLang } from '../i18n.jsx';

const Shield = (
  <svg viewBox="5.5 3 21 26" width="23" height="29" preserveAspectRatio="xMinYMid meet" aria-hidden="true">
    <path d="M16 3 26.5 6.2V13.8C26.5 21.2 21.9 26.2 16 29 10.1 26.2 5.5 21.2 5.5 13.8V6.2Z" fill="#fff" />
    <path d="M16 5.6 24 8V13.8C24 19.6 20.2 23.7 16 26.2 11.8 23.7 8 19.6 8 13.8V8Z" fill="none" stroke="#0b7d70" strokeOpacity="0.5" strokeWidth="1" />
    <rect x="14.3" y="9.6" width="3.4" height="11" rx="1" fill="#0e9f8e" />
    <rect x="10.5" y="13.4" width="11" height="3.4" rx="1" fill="#0e9f8e" />
  </svg>
);
const IG_GRADIENT = 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)';
const socials = [
  { key: 'yt', label: 'YouTube', color: '#FF0000', d: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' },
  { key: 'ig', label: 'Instagram', color: IG_GRADIENT, d: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z' },
];

const COLS = [
  { h: 'footer.quickLinks', links: [['nav.about', '/#about'], ['footer.ourServices', '/services'], ['nav.patients', '/how-it-works'], ['nav.doctors', '/join-network'], ['nav.ai', '/ai-features']] },
  { h: 'nav.resources', links: [['footer.cancerGuide', '/resources'], ['footer.patientStories', '/resources'], ['footer.news', '/resources'], ['footer.blogs', '/resources'], ['footer.videos', '/resources']] },
  { h: 'footer.support', links: [['footer.help', '/dashboard/help'], ['footer.faqs', '/dashboard/help'], ['nav.contact', '/contact'], ['footer.terms', '/terms'], ['footer.privacy', '/privacy']] },
];

export default function Footer() {
  const { t } = useLang();
  return (
    <footer className="site-footer" id="contact">
      <div className="container ft-grid">
        <div className="ft-brand">
          <div className="ft-logo">{Shield}<span className="ft-name">DBL <em>INTERNATIONAL</em></span></div>
          <p className="ft-tag">{t('footer.tagline')}</p>
          <div className="ft-socials">
            {socials.map((s) => (
              <a key={s.key} href="/#" aria-label={s.label} title={s.label} style={{ background: s.color }}>
                <svg viewBox="0 0 24 24" width="17" height="17" fill="#fff" aria-hidden="true"><path d={s.d} /></svg>
              </a>
            ))}
          </div>
        </div>

        {COLS.map((c) => (
          <div className="ft-col" key={c.h}>
            <h4>{t(c.h)}</h4>
            <ul>{c.links.map(([label, to]) => <li key={label}>{to.startsWith('/#') ? <a href={to}>{t(label)}</a> : <Link to={to}>{t(label)}</Link>}</li>)}</ul>
          </div>
        ))}

        <div className="ft-col ft-contact">
          <h4>{t('nav.contact')}</h4>
          <ul>
            <li>+91 80595 25000</li>
            <li>care@dblinternational.com</li>
            <li>{t('footer.serving')}</li>
          </ul>
          <h4 className="ft-trust-h">{t('footer.trust')}</h4>
          <div className="ft-trust">
            <span>HIPAA</span><span>ISO 27001</span><span>{t('footer.safe')}</span>
          </div>
        </div>
      </div>

      <div className="ft-bottom">
        <div className="container ft-bottom-inner">
          <span>{t('footer.rights')}</span>
          <span>{t('footer.motto')}</span>
        </div>
      </div>
    </footer>
  );
}
