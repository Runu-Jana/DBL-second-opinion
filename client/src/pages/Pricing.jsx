import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../i18n.jsx';
import { api, rupees } from '../api.js';

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
const Check = <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4 10-10" /></svg>;
const Ico = {
  tag: <svg viewBox="0 0 24 24" {...s}><path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z" /><circle cx="8" cy="8" r="1.4" /></svg>,
  lock: <svg viewBox="0 0 24 24" {...s}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>,
  refund: <svg viewBox="0 0 24 24" {...s}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 4v4h4" /></svg>,
  heart: <svg viewBox="0 0 24 24" {...s}><path d="M12 20s-7-4.4-9.2-9.1C1.3 7.7 3 4.8 6 4.8c1.9 0 3.2 1.1 4 2.3.8-1.2 2.1-2.3 4-2.3 3 0 4.7 2.9 3.2 6.1C19 15.6 12 20 12 20Z" /></svg>,
  shield: <svg viewBox="0 0 24 24" {...s}><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg>,
  iso: <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.3 2.3L15.5 9.5" /></svg>,
  ssl: <svg viewBox="0 0 24 24" {...s}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3M12 15v2" /></svg>,
  spark: <svg viewBox="0 0 24 24" {...s}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>,
};
const ASSURANCE = [
  { icon: Ico.tag, t: 'No Hidden Charges', d: 'What you see is what you pay.' },
  { icon: Ico.lock, t: 'Secure Payments', d: '100% secure and encrypted.' },
  { icon: Ico.refund, t: 'Money Back Guarantee', d: "Not satisfied? We've got you covered." },
  { icon: Ico.heart, t: 'Patient First', d: 'Your health and trust come first.' },
];
const TRUST = [{ icon: Ico.shield, t: 'HIPAA Compliant' }, { icon: Ico.iso, t: 'ISO 27001' }, { icon: Ico.ssl, t: 'SSL Encrypted' }];

// Fallback used only if the API can't be reached, so the page always renders.
const FALLBACK = {
  settings: { currency: 'INR', yearlyEnabled: true, yearlyDiscountPct: 20 },
  plans: [
    { id: 1, name: 'Basic Plan', tagline: 'For standard second opinion', priceMonthly: 2999, featured: false, ctaLabel: 'Choose Plan', features: ['Report review by oncology experts', 'Second opinion report', 'Email support', 'Delivery in 3 working days'] },
    { id: 2, name: 'Standard Plan', tagline: 'For comprehensive review', priceMonthly: 5999, featured: true, ctaLabel: 'Choose Plan', features: ['Everything in Basic', 'Detailed report with recommendations', 'Clinical oncology pharmacist review', 'Care coordinator support', 'Delivery in 2 working days'] },
    { id: 3, name: 'Premium Plan', tagline: 'For advanced & urgent cases', priceMonthly: 9999, featured: false, ctaLabel: 'Choose Plan', features: ['Everything in Standard', 'Priority case handling', 'Oncologist panel review', 'Live consultation (Optional)', 'Delivery in 24–48 hours'] },
  ],
  offers: [],
};

export default function Pricing() {
  const { requestUpload } = useAuth();
  const { t } = useLang();
  const [yearly, setYearly] = useState(false);
  const [data, setData] = useState(FALLBACK);

  useEffect(() => {
    api('/pricing', { auth: false })
      .then((d) => { if (d && d.plans && d.plans.length) setData(d); })
      .catch(() => { /* keep fallback */ });
  }, []);

  const { settings, plans, offers } = data;
  const disc = settings?.yearlyDiscountPct || 0;
  const offerPct = (offers || []).reduce((m, o) => Math.max(m, o.discountPct || 0), 0);

  const priceOf = (plan) => {
    const base = yearly ? Math.round(plan.priceMonthly * 12 * (1 - disc / 100)) : plan.priceMonthly;
    const final = offerPct > 0 ? Math.round(base * (1 - offerPct / 100)) : base;
    return { base, final, discounted: offerPct > 0 };
  };

  return (
    <>
      <Header active="pricing" />
      <section className="pr">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb"><Link to="/">{t('nav.home')}</Link> <span>›</span> Pricing</nav>

          <div className="pr-head">
            <h1>Simple, Transparent Pricing</h1>
            <p>Choose a plan that suits your needs. World-class cancer care, accessible to all.</p>
            {settings?.yearlyEnabled && (
              <div className="pr-toggle" role="tablist" aria-label="Billing period">
                <button type="button" role="tab" aria-selected={!yearly} className={!yearly ? 'active' : ''} onClick={() => setYearly(false)}>Monthly</button>
                <button type="button" role="tab" aria-selected={yearly} className={yearly ? 'active' : ''} onClick={() => setYearly(true)}>
                  Yearly {disc > 0 && <span className="pr-save">Save {disc}%</span>}
                </button>
              </div>
            )}
          </div>

          {/* live offers */}
          {offers && offers.length > 0 && (
            <div className="pr-offers">
              {offers.map((o) => (
                <div className="pr-offer" key={o.id}>
                  <span className="pr-offer-ico">{Ico.spark}</span>
                  <div className="pr-offer-text">
                    <strong>{o.title}</strong>
                    {o.subtitle && <span>{o.subtitle}</span>}
                  </div>
                  {o.badge && <span className="pr-offer-badge">{o.badge}</span>}
                </div>
              ))}
            </div>
          )}

          <div className="pr-grid">
            {plans.map((p) => {
              const pr = priceOf(p);
              return (
                <article className={'pr-card' + (p.featured ? ' featured' : '')} key={p.id}>
                  {p.featured && <span className="pr-badge">Most Popular</span>}
                  <h2>{p.name}</h2>
                  {p.tagline && <p className="pr-tag">{p.tagline}</p>}
                  <div className="pr-price">
                    {pr.discounted && <span className="pr-was">{rupees(pr.base)}</span>}
                    <strong>{rupees(pr.final)}</strong>
                    <span>{yearly ? '/year' : 'one-time'}</span>
                  </div>
                  <ul className="pr-feats">
                    {(p.features || []).map((f, i) => (<li key={i}><span className="pr-check">{Check}</span>{f}</li>))}
                  </ul>
                  <button type="button" className={'btn ' + (p.featured ? 'btn-primary' : 'btn-outline')} onClick={requestUpload}>{p.ctaLabel || 'Choose Plan'}</button>
                </article>
              );
            })}

            <aside className="pr-assurance">
              {ASSURANCE.map((a) => (
                <div className="pr-assure" key={a.t}>
                  <span className="pr-assure-ico">{a.icon}</span>
                  <div><h3>{a.t}</h3><p>{a.d}</p></div>
                </div>
              ))}
            </aside>
          </div>
        </div>

        <div className="pr-security">
          <div className="container pr-security-inner">
            <div className="pr-security-left">
              <span className="pr-security-ico">{Ico.shield}</span>
              <div><strong>Your Security. Our Priority.</strong><span>We follow global standards to protect your data and privacy.</span></div>
            </div>
            <div className="pr-trust">{TRUST.map((tr) => (<span className="pr-trust-item" key={tr.t}>{tr.icon} {tr.t}</span>))}</div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
