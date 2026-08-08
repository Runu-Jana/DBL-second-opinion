import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api, rupees } from '../api.js';
import { ServiceIcon } from '../lib/icons.jsx';

export default function ServiceDetail() {
  const { id } = useParams();
  const { requestUpload } = useAuth();
  const [s, setS] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => { api(`/services/${id}`, { auth: false }).then(setS).catch(() => setError(true)); }, [id]);
  useEffect(() => { if (s) document.title = `${s.title} — DBL International`; }, [s]);

  return (
    <>
      <Header active="services" />
      <main className="doc-detail">
        <div className="container">
          <a className="back-link" href="/#services">&larr; Back to all services</a>
          {error && <p className="docs-loading">This service could not be found. <a href="/#services">See all services</a>.</p>}
          {!error && !s && <p className="docs-loading">Loading…</p>}
          {s && (
            <div className="svc-profile">
              <div className="svc-head">
                <span className="svc-icon-lg"><ServiceIcon k={s.icon} size={34} /></span>
                <div className="svc-head-meta">
                  {s.featured && <span className="doc-badge static">Popular</span>}
                  <h1>{s.title}</h1>
                  <p className="svc-tagline">{s.description}</p>
                </div>
              </div>
              <div className="svc-body">
                <div className="svc-about">
                  <h2>About this service</h2>
                  <p>{s.longDescription || s.description}</p>
                </div>
                <aside className="svc-buy">
                  <p className="svc-price">From <strong>{rupees(s.price)}</strong>{s.priceUnit && <span className="price-unit"> {s.priceUnit}</span>}</p>
                  <button className="btn btn-primary btn-block" onClick={requestUpload}>Get Started</button>
                  <a className="btn btn-outline btn-block" href="/#contact">Talk to Care Team</a>
                  <p className="svc-note">Secure &amp; confidential · Reports reviewed within 24–48 hours.</p>
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
