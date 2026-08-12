import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import LeadPopup from '../components/LeadPopup.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../i18n.jsx';
import { api } from '../api.js';
import { ServiceIcon } from '../lib/icons.jsx';
import { FALLBACK_DOCS } from './Oncologists.jsx';

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

/* PLACEHOLDER affiliation logos — swap the marks/names for real institution logos when available. */
const PARTNERS = [
  { name: 'Apex Cancer Institute', mark: 'ACI' },
  { name: 'Meditrust Hospital', mark: 'MT' },
  { name: 'Sunrise Oncology', mark: 'SO' },
  { name: 'National Cancer Grid', mark: 'NCG' },
  { name: 'CarePlus Network', mark: 'C+' },
  { name: 'HealthBridge', mark: 'HB' },
];

/* PLACEHOLDER testimonials — replace with real, consented patient stories once collected. */
const TESTIMONIALS = [
  { name: 'Ritu Agarwal', city: 'Kolkata, West Bengal', condition: 'Breast Cancer', rating: 5, photo: '/avatar-1.jpg',
    quote: "The second opinion gave us the confidence to adjust the treatment. Every option was explained in plain, caring language." },
  { name: 'Suresh Iyer', city: 'Pune, Maharashtra', condition: 'Colon Cancer', rating: 5, photo: '/avatar-2.jpg',
    quote: 'Within two days I had a clear plan from a specialist — without travelling to another city. Truly reassuring.' },
  { name: 'Meena Reddy', city: 'Hyderabad, Telangana', condition: 'Lymphoma', rating: 5, photo: '/avatar-3.jpg',
    quote: "Compassionate, thorough and fast. It felt like the experts genuinely cared about my father's recovery." },
];

/* PLACEHOLDER doctor photos for the carousel — used only when a doctor has no real photoUrl. */
const EXPERT_PHOTOS = ['/avatar-1.jpg', '/avatar-2.jpg', '/avatar-3.jpg', '/avatar-4.jpg', '/avatar-5.jpg', '/doctor.jpg'];

const starRow = (r = 5) => '★★★★★'.slice(0, Math.round(r)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(r));

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
  const [experts, setExperts] = useState(FALLBACK_DOCS);
  const stepsRef = useRef(null);

  useEffect(() => { api('/services', { auth: false }).then((d) => { if (Array.isArray(d)) setServices(d); }).catch(() => {}); }, []);
  useEffect(() => { api('/oncologists', { auth: false }).then((d) => { if (Array.isArray(d) && d.length) setExperts(d); }).catch(() => {}); }, []);

  // Carousel: featured doctors first, then the rest.
  const carouselExperts = [...experts].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  const expTrackRef = useRef(null);

  const scrollExperts = (dir) => {
    const t = expTrackRef.current;
    if (!t) return;
    const card = t.querySelector('.ecard');
    const step = card ? card.getBoundingClientRect().width + 20 : 300;
    const maxLeft = t.scrollWidth - t.clientWidth;
    if (dir > 0 && t.scrollLeft >= maxLeft - 4) t.scrollTo({ left: 0, behavior: 'smooth' });
    else if (dir < 0 && t.scrollLeft <= 4) t.scrollTo({ left: maxLeft, behavior: 'smooth' });
    else t.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  // Gentle autoplay; pauses on interaction and respects reduced-motion.
  useEffect(() => {
    const t = expTrackRef.current;
    if (!t || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let paused = false;
    const pause = () => { paused = true; };
    const resume = () => { paused = false; };
    t.addEventListener('pointerenter', pause);
    t.addEventListener('pointerleave', resume);
    t.addEventListener('pointerdown', pause);
    t.addEventListener('focusin', pause);
    const id = setInterval(() => { if (!paused) scrollExperts(1); }, 4500);
    return () => {
      clearInterval(id);
      t.removeEventListener('pointerenter', pause);
      t.removeEventListener('pointerleave', resume);
      t.removeEventListener('pointerdown', pause);
      t.removeEventListener('focusin', pause);
    };
  }, [experts]);

  // Reveal the "How It Works" steps as they scroll into view (desktop + mobile).
  // Arm the hidden state only when we can observe — otherwise the steps stay visible.
  useEffect(() => {
    const el = stepsRef.current;
    if (!el || !('IntersectionObserver' in window)) return;
    el.classList.add('will-reveal');
    const io = new IntersectionObserver((entries) => {
      // Toggle (not once): replay the reveal each time the section scrolls back into view.
      entries.forEach((e) => el.classList.toggle('in-view', e.isIntersecting));
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

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

      {/* AFFILIATIONS — hidden for now. Only enable once real, VERIFIED institution
          affiliations exist; showing unverified logos could misrepresent the doctors.
          Flip `false` to `true` (and swap PARTNERS for real logos) to bring it back. */}
      {false && (
      <section className="partners" aria-label="Affiliations">
        <div className="container">
          <p className="partners-title">{t('partners.title')}</p>
          <div className="partners-row">
            {PARTNERS.map((p) => (
              <span className="partner-logo" key={p.name} title={p.name}>
                <span className="partner-mark" aria-hidden="true">{p.mark}</span>
                <span className="partner-name">{p.name}</span>
              </span>
            ))}
          </div>
        </div>
      </section>
      )}

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
                <a className="service-link" href={`/services/${s.id}`}>{t('services.viewDetails')} &rarr;</a>
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

      {/* HOW IT WORKS */}
      <section className="how-light" id="how">
        <div className="container">
          <div className="section-head"><h2>{t('how.title')}</h2><span className="section-underline" /></div>
          <div className="steps-light" ref={stepsRef}>
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

      {/* FEATURED EXPERTS — pulled from the live oncologist roster (falls back to samples) */}
      <section className="home-experts" id="experts">
        <div className="container">
          <div className="section-head">
            <p className="section-eyebrow">{t('experts.eyebrow')}</p>
            <h2>{t('experts.title')}</h2>
            <span className="section-underline" />
            <p className="section-sub">{t('experts.sub')}</p>
          </div>
          <div className="ecarousel">
            <button type="button" className="ecar-arrow ecar-prev" onClick={() => scrollExperts(-1)} aria-label="Previous experts">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <div className="ecar-track" ref={expTrackRef}>
              {carouselExperts.map((d, i) => (
                <article className="ecard" key={d.id}>
                  <div className="ecard-photo">
                    <img src={d.photoUrl || EXPERT_PHOTOS[i % EXPERT_PHOTOS.length]} alt={d.name} loading="lazy" />
                    {d.featured && <span className="ecard-badge">{t('detail.featured')}</span>}
                  </div>
                  <div className="ecard-body">
                    <h3 className="ecard-name"><Link to={`/oncologists/${d.id}`}>{d.name}</Link></h3>
                    <p className="ecard-spec">{d.specialty}</p>
                    <p className="ecard-place">{[d.hospital, d.city].filter(Boolean).join(' · ')}</p>
                    <div className="ecard-meta">
                      <span>{d.experience}+ {t('detail.yrsExp')}</span>
                      {d.rating && <span className="ecard-stars" title={`${d.rating} / 5`}>{starRow(d.rating)}</span>}
                    </div>
                    <Link className="ecard-cta" to={`/oncologists/${d.id}`}>{t('detail.viewProfile')} &rarr;</Link>
                  </div>
                </article>
              ))}
            </div>
            <button type="button" className="ecar-arrow ecar-next" onClick={() => scrollExperts(1)} aria-label="Next experts">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>
          <div className="fexp-all">
            <Link className="btn btn-outline" to="/oncologists">{t('experts.viewAll')} &rarr;</Link>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS — placeholder patient stories; replace with real, consented ones */}
      <section className="reviews" id="reviews">
        <div className="container">
          <div className="section-head">
            <p className="section-eyebrow">{t('reviews.eyebrow')}</p>
            <h2>{t('reviews.title')}</h2>
            <span className="section-underline" />
            <p className="section-sub">{t('reviews.sub')}</p>
          </div>
          <div className="reviews-grid">
            {TESTIMONIALS.map((r) => (
              <figure className="review-card" key={r.name}>
                <div className="review-stars" aria-label={`${r.rating} out of 5`}>{starRow(r.rating)}</div>
                <blockquote className="review-quote">“{r.quote}”</blockquote>
                <figcaption className="review-person">
                  <img className="review-photo" src={r.photo} alt="" loading="lazy" />
                  <span className="review-id">
                    <strong>{r.name}</strong>
                    <span className="review-meta">{r.condition} · {r.city}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <LeadPopup />
    </>
  );
}
