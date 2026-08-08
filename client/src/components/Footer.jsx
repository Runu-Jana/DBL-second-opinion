import { Link } from 'react-router-dom';

const Shield = (
  <svg viewBox="0 0 32 32" width="34" height="36" aria-hidden="true">
    <path d="M16 3 26.5 6.2V13.8C26.5 21.2 21.9 26.2 16 29 10.1 26.2 5.5 21.2 5.5 13.8V6.2Z" fill="#fff" />
    <path d="M16 5.6 24 8V13.8C24 19.6 20.2 23.7 16 26.2 11.8 23.7 8 19.6 8 13.8V8Z" fill="none" stroke="#0b7d70" strokeOpacity="0.5" strokeWidth="1" />
    <rect x="14.3" y="9.6" width="3.4" height="11" rx="1" fill="#0e9f8e" />
    <rect x="10.5" y="13.4" width="11" height="3.4" rx="1" fill="#0e9f8e" />
  </svg>
);
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
const socials = [
  <svg key="fb" viewBox="0 0 24 24" width="16" height="16" {...S}><path d="M14 8h2V5h-2a3 3 0 0 0-3 3v2H9v3h2v6h3v-6h2l1-3h-3V8a1 1 0 0 1 1-1Z" /></svg>,
  <svg key="tw" viewBox="0 0 24 24" width="16" height="16" {...S}><path d="M4 5l7 8-7 6h2l6-5 4 5h4l-7-9 6-5h-2l-5 4-3-4H4Z" /></svg>,
  <svg key="in" viewBox="0 0 24 24" width="16" height="16" {...S}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 10v6M8 7v.01M12 16v-4a2 2 0 0 1 4 0v4" /></svg>,
  <svg key="yt" viewBox="0 0 24 24" width="16" height="16" {...S}><rect x="3" y="6" width="18" height="12" rx="3" /><path d="m11 9 4 3-4 3V9Z" /></svg>,
  <svg key="ig" viewBox="0 0 24 24" width="16" height="16" {...S}><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="12" cy="12" r="3.5" /><path d="M17 7v.01" /></svg>,
];

const COLS = [
  { h: 'Quick Links', links: [['About Us', '/#about'], ['Our Services', '/#services'], ['For Patients', '/how-it-works'], ['For Doctors', '/join-network'], ['AI Features', '/ai-features']] },
  { h: 'Resources', links: [['Cancer Guide', '/resources'], ['Patient Stories', '/resources'], ['News & Updates', '/resources'], ['Blogs', '/resources'], ['Videos & Podcasts', '/resources']] },
  { h: 'Support', links: [['Help Center', '/dashboard/help'], ['FAQs', '/dashboard/help'], ['Contact Us', '/contact'], ['Terms & Conditions', '/#'], ['Privacy Policy', '/#']] },
];

export default function Footer() {
  return (
    <footer className="site-footer" id="contact">
      <div className="container ft-grid">
        <div className="ft-brand">
          <div className="ft-logo">{Shield}<span className="ft-name">DBL <em>INTERNATIONAL</em></span></div>
          <p className="ft-tag">Clinical Oncology Pharmacy &amp;<br />Cancer Second Opinion Centre</p>
          <div className="ft-socials">{socials.map((s, i) => <a key={i} href="/#" aria-label="social link">{s}</a>)}</div>
        </div>

        {COLS.map((c) => (
          <div className="ft-col" key={c.h}>
            <h4>{c.h}</h4>
            <ul>{c.links.map(([label, to]) => <li key={label}>{to.startsWith('/#') ? <a href={to}>{label}</a> : <Link to={to}>{label}</Link>}</li>)}</ul>
          </div>
        ))}

        <div className="ft-col ft-contact">
          <h4>Contact Us</h4>
          <ul>
            <li>+91 80595 25000</li>
            <li>care@dblinternational.com</li>
            <li>Serving patients in 20+ countries</li>
          </ul>
          <h4 className="ft-trust-h">Trust &amp; Compliance</h4>
          <div className="ft-trust">
            <span>HIPAA</span><span>ISO 27001</span><span>Safe &amp; Secure</span>
          </div>
        </div>
      </div>

      <div className="ft-bottom">
        <div className="container ft-bottom-inner">
          <span>© 2025 DBL International. All rights reserved.</span>
          <span>Delivering Expert Care. Delivering Hope. Worldwide.</span>
        </div>
      </div>
    </footer>
  );
}
