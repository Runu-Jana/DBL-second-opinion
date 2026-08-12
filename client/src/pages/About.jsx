import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { useLang } from '../i18n.jsx';

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
const Check = <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4 10-10" /></svg>;
const Ico = {
  pill: <svg viewBox="0 0 24 24" {...s}><rect x="3" y="8" width="18" height="8" rx="4" /><path d="M12 8v8" /></svg>,
  report: <svg viewBox="0 0 24 24" {...s}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M9.5 12h5M9.5 15h5" /></svg>,
  hands: <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9S14.5 18.5 12 21C9.5 18.5 8.2 15.3 8.2 12S9.5 5.5 12 3Z" /></svg>,
  eye: <svg viewBox="0 0 24 24" {...s}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>,
  target: <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></svg>,
  shield: <svg viewBox="0 0 24 24" {...s}><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg>,
};

const DO = [
  { icon: Ico.pill, t: 'Clinical Oncology Pharmacy Services', items: ['Cancer Medication Review', 'Chemotherapy Medication Review', 'Drug Interaction Analysis'] },
  { icon: Ico.report, t: 'Cancer Medical Second Opinion', items: ['Treatment Plan Review', 'Virtual Expert Consultation', 'Multidisciplinary Expert Coordination'] },
  { icon: Ico.hands, t: 'National & International Patient Assistance', items: ['Hospital & Specialist Coordination', 'Follow-up Care Support'] },
];
const MISSION = [
  'Improve the safety and effectiveness of cancer treatment.',
  'Help patients understand their medicines and treatment options.',
  'Connect patients with qualified cancer specialists.',
  'Provide compassionate care coordination from diagnosis through follow-up.',
  'Make expert cancer guidance accessible through secure digital technology.',
];
const WHY = [
  'Evidence-based clinical oncology pharmacy services',
  'Expert cancer second opinion network',
  'Secure online medical report review',
  'Personalized cancer care coordination',
  'Transparent service packages',
  'Dedicated patient support',
  'Confidential and secure handling of medical records',
];
const VALUES = [
  { t: 'Patient First', img: '/value-1.jpg', d: 'Every decision begins with what’s best for you — your comfort, clarity, and outcome always come first.', icon: <svg viewBox="0 0 24 24" {...s}><path d="M12 20.3l-1.45-1.32C5.4 14.24 2 11.17 2 7.5 2 4.42 4.42 2 7.5 2c1.74 0 3.41.81 4.5 2.09C13.09 2.81 14.76 2 16.5 2 19.58 2 22 4.42 22 7.5c0 3.67-3.4 6.74-8.55 11.48L12 20.3z" /></svg> },
  { t: 'Clinical Excellence', img: '/value-2.jpg', d: 'Our second opinions are grounded in current evidence and reviewed by leading oncology specialists.', icon: <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="8" r="5" /><path d="M9 12.5 8 21l4-2.5L16 21l-1-8.5" /></svg> },
  { t: 'Integrity', img: '/value-3.jpg', d: 'We give honest, unbiased guidance — even when it’s difficult — because your trust means everything to us.', icon: <svg viewBox="0 0 24 24" {...s}><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg> },
  { t: 'Compassion', img: '/value-4.jpg', d: 'Behind every report is a person facing uncertainty; we respond with empathy, patience, and genuine care.', icon: <svg viewBox="0 0 24 24" {...s}><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 12V4a1.5 1.5 0 0 1 3 0v8M14 12V6a1.5 1.5 0 0 1 3 0v7c0 3.5-2.4 6-6 6-2.2 0-3.6-1-5-2.4L4.4 13.9a1.6 1.6 0 0 1 2.3-2.2L8 13.2" /></svg> },
  { t: 'Innovation', img: '/value-5.jpg', d: 'We use modern technology and AI-assisted insights to make expert cancer guidance faster and clearer.', icon: <svg viewBox="0 0 24 24" {...s}><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8v.3h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3Z" /></svg> },
  { t: 'Confidentiality', img: '/value-6.jpg', d: 'Your medical records are handled with strict privacy safeguards and never shared without your consent.', icon: <svg viewBox="0 0 24 24" {...s}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg> },
  { t: 'Collaboration', img: '/value-7.jpg', d: 'Specialists and care teams work together across borders to give you one clear, unified recommendation.', icon: <svg viewBox="0 0 24 24" {...s}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3 2.5-5 6-5s6 2 6 5" /><path d="M16 6.5a3 3 0 0 1 0 5.8M21 20c0-2.3-1.4-4-3.5-4.7" /></svg> },
  { t: 'Accessibility', img: '/value-8.jpg', d: 'World-class oncology guidance shouldn’t depend on where you live — we bring expert care within everyone’s reach.', icon: <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9S14.5 18.5 12 21C9.5 18.5 8.2 15.3 8.2 12S9.5 5.5 12 3Z" /></svg> },
];

export default function About() {
  const { t } = useLang();
  return (
    <>
      <Header active="about" />
      <section className="ab">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb"><Link to="/">{t('nav.home')}</Link> <span>›</span> About Us</nav>

          {/* hero */}
          <div className="ab-hero">
            <div className="ab-intro">
              <span className="jn-eyebrow">About Us</span>
              <h1>About DBL International</h1>
              <p className="ab-tagline">Right Cancer Treatment. Right Expert. Right Guidance.</p>
              <p className="ab-lede">DBL International is a patient-centered digital cancer care platform dedicated to helping individuals and families make informed decisions throughout their cancer journey. Our mission is to combine clinical oncology pharmacy expertise, expert cancer second opinions, and personalized care coordination to improve the quality and safety of cancer treatment.</p>
              <p className="ab-lede">We believe every cancer patient deserves access to trusted experts, evidence-based medication guidance, and seamless support—regardless of where they live.</p>
            </div>
            <aside className="ab-hero-card">
              <img className="ab-hero-photo" src="/about-team.jpg" alt="DBL International care team" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              <div className="ab-hero-body">
                <span className="ab-hero-mark" aria-hidden="true">{Ico.shield}</span>
                <p className="ab-hero-name">DBL <em>INTERNATIONAL</em></p>
                <p className="ab-hero-sub">Clinical Oncology Pharmacy &amp; Cancer Second Opinion Centre</p>
              </div>
            </aside>
          </div>

          {/* what we do */}
          <div className="ab-block">
            <h2 className="ab-h2">What We Do</h2>
            <div className="ab-do-grid">
              {DO.map((d) => (
                <article className="ab-do-card" key={d.t}>
                  <div className="card-head">
                    <span className="ab-do-ico">{d.icon}</span>
                    <h3>{d.t}</h3>
                  </div>
                  <ul>{d.items.map((it) => <li key={it}><span className="ab-tick">{Check}</span>{it}</li>)}</ul>
                </article>
              ))}
            </div>
          </div>

          {/* vision + mission */}
          <div className="ab-vm">
            <div className="ab-vm-card ab-vision">
              <span className="ab-vm-bg" aria-hidden="true">{Ico.eye}</span>
              <div className="card-head">
                <span className="ab-vm-ico">{Ico.eye}</span>
                <h3>Our Vision</h3>
              </div>
              <p>To become one of the world's most trusted digital cancer care platforms by delivering high-quality oncology pharmacy services, expert second opinions, and personalized patient support.</p>
            </div>
            <div className="ab-vm-card">
              <span className="ab-vm-bg" aria-hidden="true">{Ico.target}</span>
              <div className="card-head">
                <span className="ab-vm-ico">{Ico.target}</span>
                <h3>Our Mission</h3>
              </div>
              <ul className="ab-check">{MISSION.map((m) => <li key={m}><span className="ab-tick">{Check}</span>{m}</li>)}</ul>
            </div>
          </div>

          {/* why choose — styled as an ab-vm card so it matches the Vision/Mission cards */}
          <div className="ab-block ab-why-block">
            <div className="ab-vm-card ab-why-card">
              <span className="ab-vm-bg" aria-hidden="true">{Ico.shield}</span>
              <div className="card-head">
                <span className="ab-vm-ico">{Ico.shield}</span>
                <h3>Why Choose DBL International?</h3>
              </div>
              <ul className="ab-why">{WHY.map((w) => <li key={w}><span className="ab-tick">{Check}</span>{w}</li>)}</ul>
            </div>
          </div>

          {/* values */}
          <div className="ab-block">
            <h2 className="ab-h2">Our Values</h2>
            <div className="ab-values">{VALUES.map((v) => (
              <div className="ab-value" key={v.t} tabIndex={0}>
                <div className="ab-value-inner">
                  <figure className="ab-value-front">
                    <img src={v.img} alt={v.t} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    <figcaption>{v.t}</figcaption>
                  </figure>
                  <div className="ab-value-back">
                    <span className="ab-value-ico" aria-hidden="true">{v.icon}</span>
                    <h3>{v.t}</h3>
                    <p>{v.d}</p>
                  </div>
                </div>
              </div>
            ))}</div>
          </div>

          {/* important notice */}
          <div className="ab-notice">
            <span className="ab-notice-ico">{Ico.shield}</span>
            <div>
              <h3>Important Notice</h3>
              <p>DBL International provides Clinical Oncology Pharmacy services, care coordination, and access to expert medical second opinions. Medical diagnoses and treatment decisions are made by appropriately qualified and registered treating physicians and oncology specialists. Clinical oncology pharmacy services are provided within the professional scope of qualified pharmacists. This approach aligns with the need for patient safety, multidisciplinary care, and evidence-based oncology practice.</p>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
