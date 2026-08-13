import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { api } from '../api.js';
import { useLang } from '../i18n.jsx';

export const FALLBACK_DOCS = [
  { id: 1, name: 'Dr. Bhoumik Kadhye', specialty: 'Medical Oncology', qualifications: 'MBBS, MD, DM (Medical Oncology)', experience: 16, hospital: 'Apex Cancer Institute', city: 'Mumbai', bio: 'Specialises in solid tumours and personalised chemotherapy protocols.', rating: 4.9, featured: true },
  { id: 2, name: 'Dr. Ananya Sharma', specialty: 'Surgical Oncology', qualifications: 'MBBS, MS, MCh (Surgical Oncology)', experience: 14, hospital: 'Sunrise Oncology Centre', city: 'Delhi', bio: 'Expert in minimally invasive and breast-conserving cancer surgery.', rating: 4.8, featured: true },
  { id: 3, name: 'Dr. Rajesh Menon', specialty: 'Radiation Oncology', qualifications: 'MBBS, MD (Radiation Oncology)', experience: 18, hospital: 'Meditrust Cancer Hospital', city: 'Bengaluru', bio: 'Leads advanced IMRT and stereotactic radiosurgery programmes.', rating: 4.9, featured: true },
  { id: 4, name: 'Dr. Priya Nair', specialty: 'Paediatric Oncology', qualifications: 'MBBS, MD, Fellowship (Paediatric Haemato-Oncology)', experience: 12, hospital: 'Little Hearts Children’s Hospital', city: 'Chennai', bio: 'Dedicated to childhood cancers and blood disorders.', rating: 4.9 },
  { id: 5, name: 'Dr. Arjun Deshpande', specialty: 'Haemato-Oncology', qualifications: 'MBBS, MD, DM (Clinical Haematology)', experience: 15, hospital: 'Apex Cancer Institute', city: 'Pune', bio: 'Focuses on leukaemia, lymphoma and bone-marrow transplantation.', rating: 4.7 },
  { id: 6, name: 'Dr. Fatima Qureshi', specialty: 'Gynaecologic Oncology', qualifications: 'MBBS, MS (OBG), Fellowship (Gynae-Oncology)', experience: 13, hospital: 'Sunrise Oncology Centre', city: 'Hyderabad', bio: 'Specialises in ovarian, cervical and uterine cancers.', rating: 4.8 },
];

// Placeholder doctor photos, used until a real photoUrl is uploaded via admin.
export const EXPERT_PHOTOS = ['/avatar-1.jpg', '/avatar-2.jpg', '/avatar-3.jpg', '/avatar-4.jpg', '/avatar-5.jpg', '/doctor.jpg'];
// Resolve a doctor's photo the SAME way everywhere (home carousel + this page): real
// photo if set, else a stable placeholder keyed by id so a doctor always looks identical.
export const docPhoto = (d) => d.photoUrl || EXPERT_PHOTOS[(Number(d.id) || 0) % EXPERT_PHOTOS.length];
const stars = (r) => '★★★★★'.slice(0, Math.round(r)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(r));
const PER = 9;

function DocCard({ d, t }) {
  const place = [d.hospital, d.city].filter(Boolean).join(' · ');
  return (
    <article className="doc-card">
      {d.featured && <span className="doc-badge">{t('detail.featured')}</span>}
      <Link className="doc-avatar" to={`/oncologists/${d.id}`} aria-label={d.name}>
        <img src={docPhoto(d)} alt={d.name} loading="lazy" />
      </Link>
      <h3 className="doc-name"><Link to={`/oncologists/${d.id}`}>{d.name}</Link></h3>
      <p className="doc-specialty">{d.specialty}</p>
      <p className="doc-qual">{d.qualifications}</p>
      {place && <p className="doc-place">{place}</p>}
      <div className="doc-meta">
        <span className="doc-exp">{d.experience}+ {t('detail.yrsExp')}</span>
        <span className="doc-rating" title={`${d.rating} / 5`}>{stars(d.rating)}</span>
      </div>
      {d.bio && <p className="doc-bio">{d.bio}</p>}
      <Link className="btn btn-primary doc-cta" to={`/oncologists/${d.id}`}>{t('detail.viewProfile')}</Link>
    </article>
  );
}

export default function Oncologists() {
  const { t } = useLang();
  const [all, setAll] = useState([]);
  const [q, setQ] = useState('');
  const [specialty, setSpecialty] = useState('All');
  const [page, setPage] = useState(1);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Use whatever the admin-managed API returns (even an empty list); only fall back
    // to demo data if the API is genuinely unreachable — so the admin stays authoritative.
    api('/oncologists', { auth: false })
      .then((d) => setAll(Array.isArray(d) ? d : FALLBACK_DOCS))
      .catch(() => setAll(FALLBACK_DOCS));
  }, []);

  const specialties = useMemo(
    () => ['All', ...Array.from(new Set(all.map((d) => d.specialty))).sort()],
    [all]
  );
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all.filter((d) => {
      if (specialty !== 'All' && d.specialty !== specialty) return false;
      if (!s) return true;
      return [d.name, d.specialty, d.qualifications, d.hospital, d.city].some((v) => v && String(v).toLowerCase().includes(s));
    });
  }, [all, q, specialty]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER));
  const cur = Math.min(page, pages);
  const slice = filtered.slice((cur - 1) * PER, cur * PER);

  return (
    <>
      <Header active="oncologists" />
      <section className="page-banner">
        <div className="container">
          <p className="eyebrow">{t('detail.eyebrow')}</p>
          <h1>{t('detail.title')}</h1>
          <p className="banner-sub">{t('detail.sub')}</p>
        </div>
      </section>

      <section className="docs-section">
        <div className="container">
          <div className="docs-toolbar">
            <div className="docs-search">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
              <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={t('detail.search')} aria-label="Search oncologists" />
            </div>
            <p className="docs-count">{filtered.length} {filtered.length === 1 ? t('detail.specialist') : t('detail.specialists')}</p>
          </div>

          <div className="docs-filter">
            {specialties.map((s) => (
              <button key={s} className={'chip' + (s === specialty ? ' active' : '')} onClick={() => { setSpecialty(s); setPage(1); }}>{s === 'All' ? t('detail.all') : s}</button>
            ))}
          </div>

          <div className="docs-grid">
            {error ? <p className="docs-loading">{t('detail.loadError')}</p>
              : slice.length ? slice.map((d) => <DocCard key={d.id} d={d} t={t} />)
              : <p className="docs-loading">{t('detail.noMatch')}</p>}
          </div>

          {pages > 1 && (
            <nav className="docs-pager" aria-label="Pagination">
              <button className="pg-btn" disabled={cur === 1} onClick={() => setPage(cur - 1)}>‹ {t('detail.prev')}</button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <button key={p} className={'pg-btn' + (p === cur ? ' active' : '')} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="pg-btn" disabled={cur === pages} onClick={() => setPage(cur + 1)}>{t('detail.next')} ›</button>
            </nav>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
