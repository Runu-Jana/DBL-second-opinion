import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { useLang } from '../i18n.jsx';
import { FALLBACK_DOCS, docPhoto } from './Oncologists.jsx';

const stars = (r) => '★★★★★'.slice(0, Math.round(r)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(r));

export default function DoctorDetail() {
  const { id } = useParams();
  const { t } = useLang();
  const { requestUpload } = useAuth();
  const [d, setD] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api(`/oncologists/${id}`, { auth: false })
      .then(setD)
      .catch(() => {
        const f = FALLBACK_DOCS.find((x) => String(x.id) === String(id));
        if (f) setD(f); else setError(true);
      });
  }, [id]);

  useEffect(() => { if (d) document.title = `${d.name} — DBL International`; }, [d]);

  return (
    <>
      <Header active="oncologists" />
      <main className="doc-detail">
        <div className="container">
          <Link className="back-link" to="/oncologists">&larr; {t('detail.back')}</Link>
          {error && <p className="docs-loading">{t('detail.notFound')} <Link to="/oncologists">{t('detail.seeAll')}</Link>.</p>}
          {!error && !d && <p className="docs-loading">{t('detail.loading')}</p>}
          {d && (
            <div className="doc-profile">
              <div className="doc-profile-head">
                <div className="doc-avatar lg">
                  <img src={docPhoto(d)} alt={d.name} loading="lazy" />
                </div>
                <div className="doc-profile-meta">
                  {d.featured && <span className="doc-badge static">{t('detail.featuredSpecialist')}</span>}
                  <h1>{d.name}</h1>
                  <p className="doc-specialty big">{d.specialty}</p>
                  <p className="doc-qual big">{d.qualifications}</p>
                  {(d.hospital || d.city) && <p className="doc-place big">{[d.hospital, d.city].filter(Boolean).join(' · ')}</p>}
                  <div className="doc-meta">
                    <span className="doc-exp">{d.experience}+ {t('detail.yrsExperience')}</span>
                    <span className="doc-rating" title={`${d.rating} / 5`}>{stars(d.rating)} <em>{d.rating}</em></span>
                  </div>
                  <button className="btn btn-primary" onClick={requestUpload}>{t('nav.cta')}</button>
                </div>
              </div>
              {d.bio && <div className="doc-profile-bio"><h2>{t('detail.about')}</h2><p>{d.bio}</p></div>}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
