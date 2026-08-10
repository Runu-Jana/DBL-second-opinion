import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { useLang } from '../i18n.jsx';
import { Select } from '../components/AdminFields.jsx';
import { api } from '../api.js';

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
const Ico = {
  globe: <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9S14.5 18.5 12 21C9.5 18.5 8.2 15.3 8.2 12S9.5 5.5 12 3Z" /></svg>,
  ai: <svg viewBox="0 0 24 24" {...s}><rect x="7" y="7" width="10" height="10" rx="2" /><path d="M10 10h4v4h-4zM9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2" /></svg>,
  shield: <svg viewBox="0 0 24 24" {...s}><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg>,
  growth: <svg viewBox="0 0 24 24" {...s}><path d="M4 19h16M6 16l4-5 3 3 5-7" /></svg>,
  profile: <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" /></svg>,
  cases: <svg viewBox="0 0 24 24" {...s}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M9.5 12h5M9.5 15h5" /></svg>,
  opinion: <svg viewBox="0 0 24 24" {...s}><path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1Z" /><path d="M8 9h8M8 12h5" /></svg>,
  world: <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" /><path d="M2 12h20" /><path d="M12 2a15 15 0 0 1 0 20a15 15 0 0 1 0-20Z" /></svg>,
  doc: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /><circle cx="12" cy="8" r="4" /><path d="M9 12.5V15a3 3 0 0 0 6 0v-2.5" /></svg>,
};

const BENEFITS = [
  { icon: Ico.globe, t: 'Global Patient Reach', d: 'Access patients from 20+ countries.' },
  { icon: Ico.ai, t: 'AI-Powered Tools', d: 'Smart insights for better clinical decisions.' },
  { icon: Ico.shield, t: 'Secure & Compliant', d: 'HIPAA-compliant platform with end-to-end security.' },
  { icon: Ico.growth, t: 'Professional Growth', d: 'Continuous learning and collaboration opportunities.' },
];
const STEPS = [
  { n: '01', icon: Ico.profile, t: 'Create Your Profile', d: 'Complete your professional profile and verification.' },
  { n: '02', icon: Ico.cases, t: 'Review Cases', d: 'Review patient cases and medical reports.' },
  { n: '03', icon: Ico.opinion, t: 'Provide Expert Opinion', d: 'Share your expert opinion and recommendations.' },
  { n: '04', icon: Ico.world, t: 'Help Patients Worldwide', d: "Make a difference in patients' lives globally." },
];
const STATS = [
  { v: '2,500+', l: 'Expert Oncologists', icon: <svg viewBox="0 0 24 24" {...s}><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /><circle cx="12" cy="8" r="4" /><path d="M9 12.5V15a3 3 0 0 0 6 0v-2.5" /></svg> },
  { v: '50+', l: 'Countries', icon: <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9S14.5 18.5 12 21C9.5 18.5 8.2 15.3 8.2 12S9.5 5.5 12 3Z" /></svg> },
  { v: '25,000+', l: 'Cases Handled', icon: <svg viewBox="0 0 24 24" {...s}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /><path d="m9.5 13 1.7 1.7L15 11" /></svg> },
  { v: '98%', l: 'Doctor Satisfaction', icon: <svg viewBox="0 0 24 24" {...s}><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8L3.5 9.2l5.9-.9L12 3Z" /></svg> },
  { v: '24/7', l: 'Doctor Support', icon: <svg viewBox="0 0 24 24" {...s}><path d="M4 13v-1a8 8 0 0 1 16 0v1M4 13a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h1v-5H4M20 13a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-1v-5h1M20 18v1a3 3 0 0 1-3 3h-3" /></svg> },
];

const Check = <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4 10-10" /></svg>;
const WHY_JOIN = [
  'Access to a global patient base',
  'Advanced technology & AI support',
  'Timely honorarium & transparent process',
  'Continuing Medical Education (CME) opportunities',
  'Be part of a trusted, ethical, patient-first platform',
];

const SPECIALIZATIONS = ['Medical Oncology', 'Surgical Oncology', 'Radiation Oncology', 'Hematology-Oncology', 'Clinical Pharmacology', 'Pathology', 'Nuclear Medicine', 'Other'];
const EXPERIENCE = ['0–3 years', '3–5 years', '5–10 years', '10–15 years', '15+ years'];
const QUALIFICATIONS = ['MBBS', 'MD', 'DM', 'DNB', 'MCh', 'PhD', 'Other'];
const COUNTRIES = ['India', 'United States', 'United Kingdom', 'United Arab Emirates', 'Bangladesh', 'Nepal', 'Sri Lanka', 'Other'];

export default function JoinNetwork() {
  const { t } = useLang();
  const [form, setForm] = useState({ name: '', email: '', phone: '', regNo: '', spec: '', exp: '', qual: '', country: '', brief: '' });
  const [agree, setAgree] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setV = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return setError('Name and email are required.');
    if (!agree) return setError('Please agree to the Terms & Conditions and Privacy Policy to continue.');
    setError('');
    api('/doctor-applications', { method: 'POST', auth: false, body: JSON.stringify(form) })
      .then(() => setSent(true))
      .catch((ex) => setError(ex.message || 'Could not submit. Please try again.'));
  };
  const scrollToApply = () => document.getElementById('fd-apply')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <>
      <Header active="doctors" />
      <section className="fd">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link to="/">{t('nav.home')}</Link> <span>›</span> For Doctors
          </nav>

          <div className="fd-hero">
            {/* content */}
            <div className="fd-intro">
              <h1>Empowering Doctors. <br /><span className="accent">Enriching Lives.</span></h1>
              <p className="fd-lede">Join a global platform that connects you with patients worldwide and supports you with advanced tools, collaboration and growth opportunities.</p>
              <ul className="fd-benefits">
                {BENEFITS.map((b) => (
                  <li key={b.t}>
                    <span className="fd-benefit-ico">{b.icon}</span>
                    <div><h3>{b.t}</h3><p>{b.d}</p></div>
                  </li>
                ))}
              </ul>
              <div className="fd-cta">
                <button type="button" className="btn btn-primary" onClick={scrollToApply}>Join as a Doctor</button>
                <Link to="/how-it-works" className="btn btn-outline">Learn More</Link>
              </div>
            </div>

            {/* photo */}
            <div className="fd-photo">
              <img src="/doctor.jpg" alt="Oncologist reviewing a case" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              <div className="fd-photo-fallback">
                <span className="fd-photo-ico">{Ico.doc}</span>
                <span className="fd-photo-badge">2,500+ Expert Oncologists</span>
              </div>
            </div>

            {/* how it works */}
            <aside className="fd-how">
              <h2>How It Works</h2>
              <ol className="fd-steps">
                {STEPS.map((st) => (
                  <li key={st.n}>
                    <span className="fd-step-ico">{st.icon}</span>
                    <div>
                      <div className="fd-step-n">{st.n}</div>
                      <h3>{st.t}</h3>
                      <p>{st.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        </div>

        {/* stats bar */}
        <div className="fd-stats">
          <div className="container fd-stats-grid">
            {STATS.map((x) => (
              <div className="fd-stat" key={x.l}>
                <span className="fd-stat-ico">{x.icon}</span>
                <div className="fd-stat-text">
                  <strong>{x.v}</strong>
                  <span>{x.l}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* application form */}
        <div className="container">
          <div className="fd-apply" id="fd-apply">
            <div className="fd-apply-intro">
              <span className="jn-eyebrow">Apply Now</span>
              <h2>Apply to Join Our Expert Panel</h2>
              <p>Tell us about yourself — our medical board reviews every application personally, and gets back to you within 2–3 working days.</p>
              <ul className="fd-apply-points">
                <li>{Ico.shield} Verified, secure onboarding</li>
                <li>{Ico.globe} Flexible, remote case reviews</li>
                <li>{Ico.growth} Fair, transparent compensation</li>
              </ul>

              <aside className="fd-why" role="img" aria-label="A doctor warmly shaking hands with a patient">
                <h3>Why Join DBL International?</h3>
                <ul className="fd-why-list">
                  {WHY_JOIN.map((b) => (
                    <li key={b}><span className="fd-why-check">{Check}</span>{b}</li>
                  ))}
                </ul>
              </aside>
            </div>

            <div className="jn-card">
              {sent ? (
                <div className="jn-success" role="status">
                  <span className="jn-success-ico" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m8 12 2.5 2.5L16 9" /></svg>
                  </span>
                  <p>Thank you — your application has been received. Our medical team will be in touch within 2–3 working days.</p>
                </div>
              ) : (
                <form className="jn-form" onSubmit={submit}>
                  <label className="jn-field"><span>Full Name</span><input type="text" required value={form.name} onChange={set('name')} placeholder="Dr. Full Name" /></label>
                  <div className="jn-row">
                    <label className="jn-field"><span>Email Address</span><input type="email" required value={form.email} onChange={set('email')} placeholder="you@hospital.com" /></label>
                    <label className="jn-field"><span>Phone Number</span><input type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" /></label>
                  </div>
                  <div className="jn-row">
                    <label className="jn-field"><span>Specialization</span>
                      <Select value={form.spec} onChange={setV('spec')} options={SPECIALIZATIONS} placeholder="Select specialization" />
                    </label>
                    <label className="jn-field"><span>Medical Registration Number</span><input type="text" value={form.regNo} onChange={set('regNo')} placeholder="e.g. MCI-123456" /></label>
                  </div>
                  <div className="jn-row">
                    <label className="jn-field"><span>Years of Experience</span>
                      <Select value={form.exp} onChange={setV('exp')} options={EXPERIENCE} placeholder="Select experience" />
                    </label>
                    <label className="jn-field"><span>Highest Qualification</span>
                      <Select value={form.qual} onChange={setV('qual')} options={QUALIFICATIONS} placeholder="Select qualification" />
                    </label>
                  </div>
                  <label className="jn-field"><span>Country</span>
                    <Select value={form.country} onChange={setV('country')} options={COUNTRIES} placeholder="Select country" />
                  </label>
                  <label className="jn-field"><span>Brief About Your Experience</span>
                    <textarea rows={2} value={form.brief} onChange={set('brief')} placeholder="Tell us about your clinical background, areas of focus, and notable work…" />
                  </label>
                  <label className="jn-check">
                    <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                    <span>I agree to the <Link to="/terms">Terms &amp; Conditions</Link> and <Link to="/privacy">Privacy Policy</Link>.</span>
                  </label>
                  {error && <p style={{ color: '#ffd7d1', fontSize: '.82rem', fontWeight: 600, margin: 0 }}>{error}</p>}
                  <button type="submit" className="btn btn-primary jn-submit">Submit Application</button>
                  <p className="jn-member">Already a member? <Link to="/dashboard">Login</Link></p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
