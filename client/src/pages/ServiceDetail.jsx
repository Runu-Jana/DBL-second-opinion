import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api, rupees } from '../api.js';
import { useLang } from '../i18n.jsx';
import { ServiceIcon } from '../lib/icons.jsx';
import { FALLBACK_SERVICES } from './Home.jsx';

export default function ServiceDetail() {
  const { id } = useParams();
  const { t } = useLang();
  const { requestUpload } = useAuth();
  const [s, setS] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api(`/services/${id}`, { auth: false })
      .then(setS)
      .catch(() => {
        const f = FALLBACK_SERVICES.find((x) => String(x.id) === String(id));
        if (f) setS(f); else setError(true);
      });
  }, [id]);
  useEffect(() => { if (s) document.title = `${s.title} — DBL International`; }, [s]);

  return (
    <>
      <Header active="services" />
      <main className="doc-detail">
        <div className="container">
          <a className="back-link" href="/services">&larr; {t('detail.backSvc')}</a>
          {error && <p className="docs-loading">{t('detail.notFoundSvc')} <a href="/services">{t('detail.seeAllSvc')}</a>.</p>}
          {!error && !s && <p className="docs-loading">{t('detail.loading')}</p>}
          {s && (
            <div className="svc-profile">
              <div className="svc-head">
                <span className="svc-icon-lg"><ServiceIcon k={s.icon} size={34} /></span>
                <div className="svc-head-meta">
                  {s.featured && <span className="doc-badge static">{t('detail.popular')}</span>}
                  <h1>{s.title}</h1>
                  <p className="svc-tagline">{s.description}</p>
                </div>
              </div>
              <div className="svc-body">
                <div className="svc-about">
                  <h2>{t('detail.aboutService')}</h2>
                  <p>{s.longDescription || s.description}</p>
                </div>
                <aside className="svc-buy">
                  <p className="svc-price">{t('services.from')} <strong>{rupees(s.price)}</strong>{s.priceUnit && <span className="price-unit"> {s.priceUnit}</span>}</p>
                  <button className="btn btn-primary btn-block" onClick={requestUpload}>{t('detail.getStarted')}</button>
                  <a className="btn btn-outline btn-block" href="/#contact">{t('detail.talkToCare')}</a>
                  <p className="svc-note">{t('detail.svcNote')}</p>
                </aside>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
