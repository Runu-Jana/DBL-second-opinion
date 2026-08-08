import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { useLang } from '../i18n.jsx';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
const Ico = {
  mail: <svg viewBox="0 0 24 24" {...s}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>,
  chat: <svg viewBox="0 0 24 24" {...s}><path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1Z" /></svg>,
  brief: <svg viewBox="0 0 24 24" {...s}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
  pin: <svg viewBox="0 0 24 24" {...s}><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>,
  clock: <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  bolt: <svg viewBox="0 0 24 24" {...s}><path d="M13 3 4 14h6l-1 7 9-11h-6l1-7Z" /></svg>,
  globe: <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9S14.5 18.5 12 21C9.5 18.5 8.2 15.3 8.2 12S9.5 5.5 12 3Z" /></svg>,
  headset: <svg viewBox="0 0 24 24" {...s}><path d="M5 13v-1a7 7 0 0 1 14 0v1" /><rect x="3" y="13" width="4" height="6" rx="1.6" /><rect x="17" y="13" width="4" height="6" rx="1.6" /></svg>,
};

// Realistic political world map (real geography via react-simple-maps + Natural Earth data)
const GEO_URL = '/countries-50m.json';
const TEAL_SHADES = ['#e3f4f1', '#c7e9e3', '#a8ddd5', '#cdeae6', '#b6e2db', '#daf0ec'];
// [longitude, latitude] of served regions
const MARKERS = [[-100, 40], [-58, -12], [10, 50], [22, 6], [46, 55], [78, 22], [113, 3], [134, -26]];

function WorldMap() {
  return (
    <ComposableMap projection="geoEqualEarth" width={800} height={400}
      projectionConfig={{ scale: 145, center: [0, 0] }} style={{ width: '100%', height: '100%' }}>
      <Geographies geography={GEO_URL}>
        {({ geographies }) => geographies.map((geo, i) => (
          <Geography key={geo.rsmKey} geography={geo}
            fill={TEAL_SHADES[i % TEAL_SHADES.length]} stroke="#4f9a90" strokeWidth={0.35}
            style={{ default: { outline: 'none' }, hover: { fill: '#8fd0c7', outline: 'none' }, pressed: { outline: 'none' } }} />
        ))}
      </Geographies>
      {MARKERS.map((c, i) => (
        <Marker key={i} coordinates={c}>
          <g transform="translate(-8, -22)" style={{ filter: 'drop-shadow(0 2px 2px rgba(180,20,60,.4))' }}>
            <path d="M8 0C3.6 0 0 3.4 0 7.6 0 13.2 8 22 8 22s8-8.8 8-14.4C16 3.4 12.4 0 8 0Z" fill="#e6274b" />
            <circle cx="8" cy="7.5" r="2.8" fill="#fff" />
          </g>
        </Marker>
      ))}
    </ComposableMap>
  );
}

const CONTACTS = [
  { icon: Ico.mail, t: 'Email Us', d: 'support@dblinternational.com' },
  { icon: Ico.chat, t: 'Live Chat', d: 'Available 24/7' },
  { icon: Ico.brief, t: 'Business Inquiries', d: 'partnerships@dblinternational.com' },
  { icon: Ico.pin, t: 'Global Locations', d: 'We serve patients in 20+ countries.' },
];
const SUPPORT = [
  { icon: Ico.headset, t: '24/7 Support', d: 'We are always here to help you.' },
  { icon: Ico.bolt, t: 'Quick Response', d: 'We reply within 24 hours.' },
  { icon: Ico.globe, t: 'Multiple Languages', d: 'We speak your language.' },
];
const SUBJECTS = ['General Inquiry', 'Get a Second Opinion', 'Partnership / Business', 'Technical Support', 'Feedback', 'Other'];

export default function ContactUs() {
  const { t } = useLang();
  const [sent, setSent] = useState(false);

  return (
    <>
      <Header active="contact" />
      <section className="ct">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb"><Link to="/">{t('nav.home')}</Link> <span>›</span> Contact Us</nav>

          <div className="ct-grid">
            {/* form */}
            <div className="ct-form-col">
              <h1>We're Here to Help</h1>
              <p className="ct-sub">Reach out to us. Our team will get back to you.</p>
              {sent ? (
                <div className="dash-card jn-success" role="status" style={{ marginTop: '1rem' }}>
                  <span className="jn-success-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m8 12 2.5 2.5L16 9" /></svg></span>
                  <p>Thanks for reaching out — our team will get back to you within 24 hours.</p>
                </div>
              ) : (
                <form className="ct-form" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
                  <label className="ct-field"><span>Full Name</span><input type="text" required placeholder="Your full name" /></label>
                  <label className="ct-field"><span>Email Address</span><input type="email" required placeholder="you@example.com" /></label>
                  <label className="ct-field"><span>Subject</span>
                    <select required defaultValue=""><option value="" disabled>Select Subject</option>{SUBJECTS.map((x) => <option key={x}>{x}</option>)}</select>
                  </label>
                  <label className="ct-field"><span>Your Message</span><textarea rows="5" required placeholder="How can we help you?" /></label>
                  <button type="submit" className="btn btn-primary ct-send">Send Message</button>
                </form>
              )}
            </div>

            {/* get in touch */}
            <aside className="ct-info">
              <div className="dash-card">
                <div className="dash-card-head"><h2>Get in Touch</h2></div>
                <div className="ct-contacts">
                  {CONTACTS.map((c) => (
                    <div className="ct-contact" key={c.t}>
                      <span className="ct-contact-ico">{c.icon}</span>
                      <div><h3>{c.t}</h3><p>{c.d}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            {/* global */}
            <aside className="ct-global-col">
              <h2 className="ct-global-title">We are Global</h2>
              <p className="ct-global-sub">Delivering expert cancer care across the world.</p>
              <div className="ct-map"><WorldMap /></div>
              <div className="dash-card ct-support">
                <h3>Our Support is Available</h3>
                <div className="ct-support-grid">
                  {SUPPORT.map((sp) => (
                    <div className="ct-support-item" key={sp.t}>
                      <span className="ct-support-ico">{sp.icon}</span>
                      <strong>{sp.t}</strong>
                      <span>{sp.d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div className="ct-banner">
          <div className="container ct-banner-inner">
            <div className="ct-banner-left">
              <span className="ct-banner-ico">{Ico.headset}</span>
              <div><strong>Talk to Our Care Team</strong><span>We're just a message away.</span></div>
            </div>
            <Link to="/dashboard/messages" className="btn ct-banner-btn">{Ico.chat} Chat Now</Link>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
