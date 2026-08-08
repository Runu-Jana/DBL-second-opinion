import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';

const initials = (name) => name.replace(/^Dr\.?\s*/i, '').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const stars = (r) => '★★★★★'.slice(0, Math.round(r)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(r));

export default function DoctorDetail() {
  const { id } = useParams();
  const { requestUpload } = useAuth();
  const [d, setD] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => { api(`/oncologists/${id}`, { auth: false }).then(setD).catch(() => setError(true)); }, [id]);

  useEffect(() => { if (d) document.title = `${d.name} — DBL International`; }, [d]);

  return (
    <>
      <Header active="oncologists" />
      <main className="doc-detail">
        <div className="container">
          <Link className="back-link" to="/oncologists">&larr; Back to all oncologists</Link>
          {error && <p className="docs-loading">This oncologist could not be found. <Link to="/oncologists">See all oncologists</Link>.</p>}
          {!error && !d && <p className="docs-loading">Loading…</p>}
          {d && (
            <div className="doc-profile">
              <div className="doc-profile-head">
                <div className="doc-avatar lg">
                  {d.photoUrl ? <img src={d.photoUrl} alt={d.name} /> : <span>{initials(d.name)}</span>}
                </div>
                <div className="doc-profile-meta">
                  {d.featured && <span className="doc-badge static">Featured Specialist</span>}
                  <h1>{d.name}</h1>
                  <p className="doc-specialty big">{d.specialty}</p>
                  <p className="doc-qual big">{d.qualifications}</p>
                  {(d.hospital || d.city) && <p className="doc-place big">{[d.hospital, d.city].filter(Boolean).join(' · ')}</p>}
                  <div className="doc-meta">
                    <span className="doc-exp">{d.experience}+ yrs experience</span>
                    <span className="doc-rating" title={`${d.rating} / 5`}>{stars(d.rating)} <em>{d.rating}</em></span>
                  </div>
                  <button className="btn btn-primary" onClick={requestUpload}>Get a Second Opinion</button>
                </div>
              </div>
              {d.bio && <div className="doc-profile-bio"><h2>About</h2><p>{d.bio}</p></div>}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
