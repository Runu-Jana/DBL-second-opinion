import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../i18n.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';

const BrandMark = () => (
  <span className="brand-mark" aria-hidden="true">
    <svg viewBox="4 1 24 29" width="50" height="60">
      <path d="M16 3 26.5 6.2V13.8C26.5 21.2 21.9 26.2 16 29 10.1 26.2 5.5 21.2 5.5 13.8V6.2Z" fill="currentColor" />
      <path d="M16 5.6 24 8V13.8C24 19.6 20.2 23.7 16 26.2 11.8 23.7 8 19.6 8 13.8V8Z" fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="1" />
      <rect x="14.3" y="9.6" width="3.4" height="11" rx="1" fill="#fff" />
      <rect x="10.5" y="13.4" width="11" height="3.4" rx="1" fill="#fff" />
    </svg>
  </span>
);

const initials = (name = '') =>
  name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'U';

function UserMenu({ session, logout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="header-user">
      <button type="button" className="header-bell" aria-label="Notifications" title="Notifications">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M13.7 21a2 2 0 0 1-3.4 0" /></svg>
        <span className="dot">3</span>
      </button>
      <div className="user-menu" ref={ref}>
        <button type="button" className="user-chip" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <span className="user-avatar">{initials(session.name)}</span>
          <span className="user-name">{session.name}</span>
          <svg className={'user-caret' + (open ? ' up' : '')} viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        {open && (
          <div className="user-pop" role="menu">
            <Link to="/dashboard" role="menuitem" onClick={() => setOpen(false)}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
              Dashboard
            </Link>
            <Link to="/dashboard" role="menuitem" onClick={() => setOpen(false)}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" /></svg>
              My Profile
            </Link>
            <div className="sep" />
            <button type="button" role="menuitem" className="danger" onClick={() => { setOpen(false); logout(); navigate('/'); }}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" /></svg>
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function NavDropdown({ label, active, items }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={'nav-dd' + (active ? ' active' : '')} onMouseLeave={() => setOpen(false)}>
      <button type="button" className="nav-dd-trigger" aria-haspopup="true" aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} onMouseEnter={() => setOpen(true)}>
        {label}
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      <div className={'nav-dd-menu' + (open ? ' open' : '')}>
        {items.map((it) => <Link key={it.to} to={it.to} onClick={() => setOpen(false)}>{it.label}</Link>)}
      </div>
    </div>
  );
}

export default function Header({ active }) {
  const { requestUpload, session, logout } = useAuth();
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const navRef = useRef(null);
  const toggleRef = useRef(null);
  const is = (key) => (active === key ? 'active' : undefined);

  // Close the mobile menu drawer when tapping/clicking anywhere outside it (or pressing Escape).
  useEffect(() => {
    if (!open) return;
    const onOutside = (e) => {
      if (navRef.current?.contains(e.target) || toggleRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onOutside);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onOutside); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand" to="/" aria-label="DBL International home">
          <BrandMark />
          <span className="brand-text">
            <span className="brand-name">DBL</span>
            <span className="brand-sub">INTERNATIONAL</span>
            <span className="brand-tag">Clinical Oncology Pharmacy &amp;<br />Cancer Second Opinion Centre</span>
          </span>
        </Link>

        <nav ref={navRef} className={'main-nav' + (open ? ' open' : '')} aria-label="Primary" onClick={() => setOpen(false)}>
          <Link to="/" className={is('home')}>{t('nav.home')}</Link>
          <Link to="/oncologists" className={is('oncologists')}>{t('nav.oncologists')}</Link>
          <Link to="/services" className={is('services')}>{t('nav.services')}</Link>
          <Link to="/ai-features" className={is('ai')}>{t('nav.ai')}</Link>
          <NavDropdown label={t('nav.patients')} active={active === 'patients' || active === 'how'}
            items={[{ to: '/how-it-works', label: t('nav.how') }, { to: '/for-patients', label: t('nav.upload') }]} />
          <Link to="/join-network" className={is('doctors')}>{t('nav.doctors')}</Link>
          <Link to="/resources" className={is('resources')}>{t('nav.resources')}</Link>
          {session && <Link to="/dashboard" className={is('dashboard')}>{t('nav.dashboard')}</Link>}
          <Link to="/about" className={is('about')}>{t('nav.about')}</Link>
          <Link to="/contact" className={is('contact')}>{t('nav.contact')}</Link>
        </nav>

        <div className="header-actions">
          <LanguageSwitcher />
          {session
            ? <UserMenu session={session} logout={logout} />
            : <button type="button" className="btn btn-primary header-cta" onClick={requestUpload}>{t('nav.cta')}</button>}
        </div>
        <button ref={toggleRef} className="nav-toggle" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <span></span><span></span><span></span>
        </button>
      </div>
    </header>
  );
}
