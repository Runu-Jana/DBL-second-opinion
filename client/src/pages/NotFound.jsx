// 404 — reached via the catch-all route. Visitors here are often patients following a stale
// link from an email or a search result, so the page stays calm and reassuring rather than
// playful, and leads with the things people actually came for.
//
// The URL that was attempted is deliberately NOT printed back: an attacker can put any text
// they like in a path, and a page that echoes it turns into a way to show invented messages
// ("call this number about your account") under our own domain.
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import Seo from '../components/Seo.jsx';
import { useLang } from '../i18n.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const I = {
  compass: (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2.1 5-5 2.1 2.1-5z" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20" /><circle cx="9.5" cy="7" r="3.2" /><path d="M17 11.2A3.2 3.2 0 0 0 17 5m4 15v-1.5a4 4 0 0 0-3-3.8" />
    </svg>
  ),
  upload: (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v3.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V15" /><path d="M12 15.5V3.5m0 0L7.5 8M12 3.5 16.5 8" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v15H5.5A1.5 1.5 0 0 0 4 19.5z" /><path d="M4 19.5A1.5 1.5 0 0 1 5.5 18H19v3H5.5A1.5 1.5 0 0 1 4 19.5z" />
    </svg>
  ),
  phone: (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 16.9v2.6a1.7 1.7 0 0 1-1.9 1.7 17 17 0 0 1-7.4-2.6 16.6 16.6 0 0 1-5.1-5.1A17 17 0 0 1 4 6.1 1.7 1.7 0 0 1 5.7 4.2h2.6a1.7 1.7 0 0 1 1.7 1.5c.1.9.3 1.7.6 2.5a1.7 1.7 0 0 1-.4 1.8l-1.1 1.1a13.6 13.6 0 0 0 5.1 5.1l1.1-1.1a1.7 1.7 0 0 1 1.8-.4c.8.3 1.6.5 2.5.6a1.7 1.7 0 0 1 1.4 1.6z" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 6 8.5-6" />
    </svg>
  ),
};

// A signpost on a quiet teal field — brand-consistent, and calmer than a giant "404".
const Illustration = (
  <svg className="nf-art" viewBox="0 0 200 150" role="img" aria-label="A signpost pointing in several directions" focusable="false">
    <ellipse cx="100" cy="132" rx="62" ry="9" fill="#0e9f8e" opacity=".10" />
    <path d="M100 132V38" stroke="#0b7d70" strokeWidth="7" strokeLinecap="round" opacity=".85" />
    <g opacity=".95">
      <path d="M96 52H44l-11 11 11 11h52z" fill="#0e9f8e" />
      <path d="M104 82h52l11 11-11 11h-52z" fill="#12b3a0" opacity=".85" />
      <path d="M96 96H52l-11-11 11-11h44z" fill="#d0efec" />
    </g>
    <circle cx="100" cy="34" r="9" fill="#fff" stroke="#0b7d70" strokeWidth="4" />
  </svg>
);

export default function NotFound() {
  const { t } = useLang();
  const { session } = useAuth();

  const links = [
    { to: '/oncologists', icon: I.users, label: t('nav.oncologists'), desc: t('nf.oncologistsDesc') },
    { to: '/how-it-works', icon: I.compass, label: t('nav.how'), desc: t('nf.howDesc') },
    { to: '/upload-reports', icon: I.upload, label: t('nav.upload'), desc: t('nf.uploadDesc') },
    { to: '/resources', icon: I.book, label: t('nav.resources'), desc: t('nf.resourcesDesc') },
  ];

  return (
    <>
      <Seo title={t('nf.h1')} description={t('nf.sub')} noindex />
      <Header />
      <section className="nf">
        <div className="container nf-inner">
          {Illustration}
          <span className="nf-badge">404 · {t('nf.badge')}</span>
          <h1>{t('nf.h1')}</h1>
          <p className="nf-sub">{t('nf.sub')}</p>

          <div className="nf-actions">
            <Link className="btn btn-primary" to="/upload-reports">{t('nf.primary')}</Link>
            {session
              ? <Link className="btn btn-outline" to="/dashboard">{t('nf.dashboard')}</Link>
              : <Link className="btn btn-outline" to="/">{t('nf.home')}</Link>}
          </div>

          <h2 className="nf-h2">{t('nf.popular')}</h2>
          <div className="nf-links">
            {links.map((l) => (
              <Link className="nf-link" to={l.to} key={l.to}>
                <span className="nf-ico">{l.icon}</span>
                <span className="nf-text"><strong>{l.label}</strong><em>{l.desc}</em></span>
              </Link>
            ))}
          </div>

          <div className="nf-help">
            <div>
              <strong>{t('nf.helpH')}</strong>
              <p>{t('nf.helpSub')}</p>
            </div>
            <div className="nf-help-links">
              <a href="tel:+918059525000">{I.phone} +91 80595 25000</a>
              <a href="mailto:care@dblhealthcare.com">{I.mail} care@dblhealthcare.com</a>
              <Link className="btn btn-outline" to="/contact">{t('nf.helpCta')}</Link>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
