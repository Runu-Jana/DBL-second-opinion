import { useEffect, useRef, useState } from 'react';
import { api, getToken, setToken, clearToken, rupees } from '../api.js';
import { SERVICE_ICON_KEYS } from '../lib/icons.jsx';

const Mark = () => (
  <span className="modal-mark" aria-hidden="true">
    <svg viewBox="0 0 32 32" width="28" height="30"><path d="M16 3 26.5 6.2V13.8C26.5 21.2 21.9 26.2 16 29 10.1 26.2 5.5 21.2 5.5 13.8V6.2Z" fill="currentColor" /><path d="M16 5.6 24 8V13.8C24 19.6 20.2 23.7 16 26.2 11.8 23.7 8 19.6 8 13.8V8Z" fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="1" /><rect x="14.3" y="9.6" width="3.4" height="11" rx="1" fill="#fff" /><rect x="10.5" y="13.4" width="11" height="3.4" rx="1" fill="#fff" /></svg>
  </span>
);

/* ---------- Oncologist modal ---------- */
function OncologistModal({ doc, onClose, onSaved }) {
  const empty = { name: '', specialty: '', qualifications: '', experience: 0, rating: 4.8, hospital: '', city: '', photoUrl: '', bio: '', featured: false, active: true };
  const [f, setF] = useState(empty);
  const [err, setErr] = useState('');
  const [hint, setHint] = useState('PNG, JPG or WEBP · up to 3 MB. Or paste a URL below.');
  const fileRef = useRef(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  useEffect(() => { setF(doc ? { ...empty, ...doc } : empty); setErr(''); }, [doc]);

  const upload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const fd = new FormData(); fd.append('photo', file);
    setHint('Uploading…');
    api('/upload', { method: 'POST', body: fd })
      .then((res) => { setF((p) => ({ ...p, photoUrl: res.url })); setHint('Uploaded ✓'); })
      .catch((ex) => setHint(ex.message))
      .finally(() => { e.target.value = ''; });
  };

  const submit = (e) => {
    e.preventDefault();
    if (!f.name || !f.specialty || !f.qualifications) return setErr('Name, specialty and qualifications are required.');
    const req = doc ? api(`/oncologists/${doc.id}`, { method: 'PUT', body: JSON.stringify(f) }) : api('/oncologists', { method: 'POST', body: JSON.stringify(f) });
    req.then(() => onSaved(doc ? 'Oncologist updated.' : 'Oncologist added.')).catch((ex) => setErr(ex.message));
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-wide">
        <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        <div className="modal-head left"><h3>{doc ? 'Edit Oncologist' : 'Add Oncologist'}</h3><p className="modal-sub">Fields marked * are required.</p></div>
        <form className="admin-form" onSubmit={submit}>
          <div className="admin-form-grid">
            <label>Name *<input value={f.name} onChange={set('name')} required placeholder="Dr. Full Name" /></label>
            <label>Specialty *<input value={f.specialty} onChange={set('specialty')} required placeholder="Medical Oncology" /></label>
            <label className="full">Qualifications *<input value={f.qualifications} onChange={set('qualifications')} required placeholder="MBBS, MD, DM (Oncology)" /></label>
            <label>Experience (years)<input type="number" min="0" value={f.experience} onChange={set('experience')} /></label>
            <label>Rating (0–5)<input type="number" min="0" max="5" step="0.1" value={f.rating} onChange={set('rating')} /></label>
            <label>Hospital<input value={f.hospital} onChange={set('hospital')} placeholder="Apex Cancer Institute" /></label>
            <label>City<input value={f.city} onChange={set('city')} placeholder="Mumbai" /></label>
            <label className="full">Photo
              <div className="photo-field">
                <span className={'photo-preview' + (f.photoUrl ? ' has-img' : '')} style={f.photoUrl ? { backgroundImage: `url("${f.photoUrl}")` } : undefined} aria-hidden="true" />
                <div className="photo-controls">
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={upload} />
                  <button type="button" className="btn-ghost sm" onClick={() => fileRef.current.click()}>Upload image</button>
                  {f.photoUrl && <button type="button" className="btn-ghost sm" onClick={() => setF({ ...f, photoUrl: '' })}>Remove</button>}
                  <span className="photo-hint">{hint}</span>
                </div>
              </div>
              <input value={f.photoUrl} onChange={set('photoUrl')} placeholder="https://… (or upload above)" />
            </label>
            <label className="full">Short bio<textarea value={f.bio} onChange={set('bio')} placeholder="A sentence or two about the doctor…" /></label>
            <div className="full checks">
              <label><input type="checkbox" checked={f.featured} onChange={set('featured')} /> Featured</label>
              <label><input type="checkbox" checked={f.active} onChange={set('active')} /> Active (visible on site)</label>
            </div>
          </div>
          {err && <p className="admin-msg err show">{err}</p>}
          <div className="admin-form-actions"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary">Save</button></div>
        </form>
      </div>
    </div>
  );
}

/* ---------- Service modal ---------- */
function ServiceModal({ svc, onClose, onSaved }) {
  const empty = { title: '', description: '', longDescription: '', price: 0, priceUnit: '', icon: 'report', order: 0, featured: false, active: true };
  const [f, setF] = useState(empty);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  useEffect(() => { setF(svc ? { ...empty, ...svc } : empty); setErr(''); }, [svc]);

  const submit = (e) => {
    e.preventDefault();
    if (!f.title || !f.description) return setErr('Title and description are required.');
    const req = svc ? api(`/services/${svc.id}`, { method: 'PUT', body: JSON.stringify(f) }) : api('/services', { method: 'POST', body: JSON.stringify(f) });
    req.then(() => onSaved(svc ? 'Service updated.' : 'Service added.')).catch((ex) => setErr(ex.message));
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-wide">
        <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        <div className="modal-head left"><h3>{svc ? 'Edit Service' : 'Add Service'}</h3><p className="modal-sub">Fields marked * are required.</p></div>
        <form className="admin-form" onSubmit={submit}>
          <div className="admin-form-grid">
            <label className="full">Title *<input value={f.title} onChange={set('title')} required placeholder="Cancer Medical Second Opinion" /></label>
            <label className="full">Short description *<input value={f.description} onChange={set('description')} required placeholder="One line shown on the card" /></label>
            <label className="full">Full description<textarea value={f.longDescription} onChange={set('longDescription')} placeholder="Detailed text for the service page…" /></label>
            <label>Price (₹)<input type="number" min="0" value={f.price} onChange={set('price')} /></label>
            <label>Price unit<input value={f.priceUnit} onChange={set('priceUnit')} placeholder="/month (blank = one-time)" /></label>
            <label>Icon<select value={f.icon} onChange={set('icon')}>{SERVICE_ICON_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}</select></label>
            <label>Display order<input type="number" value={f.order} onChange={set('order')} /></label>
            <div className="full checks">
              <label><input type="checkbox" checked={f.featured} onChange={set('featured')} /> Popular</label>
              <label><input type="checkbox" checked={f.active} onChange={set('active')} /> Active (visible on site)</label>
            </div>
          </div>
          {err && <p className="admin-msg err show">{err}</p>}
          <div className="admin-form-actions"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary">Save</button></div>
        </form>
      </div>
    </div>
  );
}

/* ---------- Pricing plan modal ---------- */
function PlanModal({ plan, onClose, onSaved }) {
  const empty = { name: '', tagline: '', priceMonthly: 0, features: '', ctaLabel: 'Choose Plan', order: 0, featured: false, active: true };
  const [f, setF] = useState(empty);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  useEffect(() => {
    setF(plan ? { ...empty, ...plan, features: Array.isArray(plan.features) ? plan.features.join('\n') : (plan.features || '') } : empty);
    setErr('');
  }, [plan]);

  const submit = (e) => {
    e.preventDefault();
    if (!f.name) return setErr('Plan name is required.');
    const req = plan ? api(`/pricing/plans/${plan.id}`, { method: 'PUT', body: JSON.stringify(f) }) : api('/pricing/plans', { method: 'POST', body: JSON.stringify(f) });
    req.then(() => onSaved(plan ? 'Plan updated.' : 'Plan added.')).catch((ex) => setErr(ex.message));
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-wide">
        <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        <div className="modal-head left"><h3>{plan ? 'Edit Plan' : 'Add Plan'}</h3><p className="modal-sub">Prices are in ₹ (INR). Yearly price is calculated from the discount in Settings.</p></div>
        <form className="admin-form" onSubmit={submit}>
          <div className="admin-form-grid">
            <label>Plan name *<input value={f.name} onChange={set('name')} required placeholder="Standard Plan" /></label>
            <label>Tagline<input value={f.tagline} onChange={set('tagline')} placeholder="For comprehensive review" /></label>
            <label>Price / one-time (₹)<input type="number" min="0" value={f.priceMonthly} onChange={set('priceMonthly')} /></label>
            <label>Button label<input value={f.ctaLabel} onChange={set('ctaLabel')} placeholder="Choose Plan" /></label>
            <label className="full">Features (one per line)<textarea rows="5" value={f.features} onChange={set('features')} placeholder={'Report review by oncology experts\nSecond opinion report\nEmail support'} /></label>
            <label>Display order<input type="number" value={f.order} onChange={set('order')} /></label>
            <div className="checks">
              <label><input type="checkbox" checked={f.featured} onChange={set('featured')} /> Most Popular</label>
              <label><input type="checkbox" checked={f.active} onChange={set('active')} /> Active (visible)</label>
            </div>
          </div>
          {err && <p className="admin-msg err show">{err}</p>}
          <div className="admin-form-actions"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary">Save</button></div>
        </form>
      </div>
    </div>
  );
}

/* ---------- Offer modal ---------- */
function OfferModal({ offer, onClose, onSaved }) {
  const empty = { title: '', subtitle: '', badge: '', discountPct: 0, order: 0, active: false };
  const [f, setF] = useState(empty);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  useEffect(() => { setF(offer ? { ...empty, ...offer } : empty); setErr(''); }, [offer]);

  const submit = (e) => {
    e.preventDefault();
    if (!f.title) return setErr('Offer title is required.');
    const req = offer ? api(`/pricing/offers/${offer.id}`, { method: 'PUT', body: JSON.stringify(f) }) : api('/pricing/offers', { method: 'POST', body: JSON.stringify(f) });
    req.then(() => onSaved(offer ? 'Offer updated.' : 'Offer added.')).catch((ex) => setErr(ex.message));
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-wide">
        <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        <div className="modal-head left"><h3>{offer ? 'Edit Offer' : 'Add Offer'}</h3><p className="modal-sub">An active offer shows a banner on the Pricing page and applies its % discount to all plans.</p></div>
        <form className="admin-form" onSubmit={submit}>
          <div className="admin-form-grid">
            <label className="full">Title *<input value={f.title} onChange={set('title')} required placeholder="Independence Day Offer" /></label>
            <label className="full">Subtitle<input value={f.subtitle} onChange={set('subtitle')} placeholder="Limited-time savings on all second-opinion plans" /></label>
            <label>Badge<input value={f.badge} onChange={set('badge')} placeholder="15% OFF" /></label>
            <label>Discount (%)<input type="number" min="0" max="90" value={f.discountPct} onChange={set('discountPct')} /></label>
            <label>Display order<input type="number" value={f.order} onChange={set('order')} /></label>
            <div className="checks">
              <label><input type="checkbox" checked={f.active} onChange={set('active')} /> Live (on)</label>
            </div>
          </div>
          {err && <p className="admin-msg err show">{err}</p>}
          <div className="admin-form-actions"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary">Save</button></div>
        </form>
      </div>
    </div>
  );
}

const BLOG_CATS = ['Cancer Guide', 'Patient Stories', 'Expert Insights', 'News & Updates', 'Videos & Podcasts'];

/* ---------- Blog post modal ---------- */
function BlogModal({ post, onClose, onSaved }) {
  const empty = { title: '', category: 'Cancer Guide', excerpt: '', imageUrl: '', date: '', readTime: '', isVideo: false, order: 0, active: true };
  const [f, setF] = useState(empty);
  const [err, setErr] = useState('');
  const [hint, setHint] = useState('PNG/JPG cover image, or paste a URL below.');
  const fileRef = useRef(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  useEffect(() => { setF(post ? { ...empty, ...post } : empty); setErr(''); }, [post]);

  const upload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const fd = new FormData(); fd.append('photo', file); setHint('Uploading…');
    api('/upload', { method: 'POST', body: fd }).then((r) => { setF((p) => ({ ...p, imageUrl: r.url })); setHint('Uploaded ✓'); })
      .catch((ex) => setHint(ex.message)).finally(() => { e.target.value = ''; });
  };
  const submit = (e) => {
    e.preventDefault();
    if (!f.title || !f.excerpt) return setErr('Title and excerpt are required.');
    const req = post ? api(`/blog/${post.id}`, { method: 'PUT', body: JSON.stringify(f) }) : api('/blog', { method: 'POST', body: JSON.stringify(f) });
    req.then(() => onSaved(post ? 'Post updated.' : 'Post added.')).catch((ex) => setErr(ex.message));
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-wide">
        <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        <div className="modal-head left"><h3>{post ? 'Edit Post' : 'Add Post'}</h3><p className="modal-sub">Shown on the Resources / Blogs page.</p></div>
        <form className="admin-form" onSubmit={submit}>
          <div className="admin-form-grid">
            <label className="full">Title *<input value={f.title} onChange={set('title')} required placeholder="Understanding Your Cancer Diagnosis" /></label>
            <label>Category<select value={f.category} onChange={set('category')}>{BLOG_CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label>Order<input type="number" value={f.order} onChange={set('order')} /></label>
            <label className="full">Excerpt *<textarea value={f.excerpt} onChange={set('excerpt')} required placeholder="Short summary shown on the card…" /></label>
            <label>Date label<input value={f.date} onChange={set('date')} placeholder="10 May, 2025" /></label>
            <label>Read time<input value={f.readTime} onChange={set('readTime')} placeholder="5 min read" /></label>
            <label className="full">Cover image
              <div className="photo-field">
                <span className={'photo-preview' + (f.imageUrl ? ' has-img' : '')} style={f.imageUrl ? { backgroundImage: `url("${f.imageUrl}")` } : undefined} aria-hidden="true" />
                <div className="photo-controls">
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={upload} />
                  <button type="button" className="btn-ghost sm" onClick={() => fileRef.current.click()}>Upload image</button>
                  {f.imageUrl && <button type="button" className="btn-ghost sm" onClick={() => setF({ ...f, imageUrl: '' })}>Remove</button>}
                  <span className="photo-hint">{hint}</span>
                </div>
              </div>
              <input value={f.imageUrl} onChange={set('imageUrl')} placeholder="/blog-1.jpg or https://…" />
            </label>
            <div className="full checks">
              <label><input type="checkbox" checked={f.isVideo} onChange={set('isVideo')} /> Video / Podcast</label>
              <label><input type="checkbox" checked={f.active} onChange={set('active')} /> Active (visible)</label>
            </div>
          </div>
          {err && <p className="admin-msg err show">{err}</p>}
          <div className="admin-form-actions"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary">Save</button></div>
        </form>
      </div>
    </div>
  );
}

export default function Admin() {
  const [authed, setAuthed] = useState(!!getToken());
  const [adminName, setAdminName] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [tab, setTab] = useState('oncologists');
  const [docs, setDocs] = useState([]);
  const [services, setServices] = useState([]);
  const [msg, setMsg] = useState(null);
  const [docModal, setDocModal] = useState(undefined); // undefined=closed, null=new, obj=edit
  const [svcModal, setSvcModal] = useState(undefined);
  const [plans, setPlans] = useState([]);
  const [offers, setOffers] = useState([]);
  const [settings, setSettings] = useState({ yearlyEnabled: true, yearlyDiscountPct: 20, currency: 'INR' });
  const [planModal, setPlanModal] = useState(undefined);
  const [offerModal, setOfferModal] = useState(undefined);
  const [posts, setPosts] = useState([]);
  const [postModal, setPostModal] = useState(undefined);

  const flash = (m, kind = 'ok') => { setMsg({ m, kind }); if (kind === 'ok') setTimeout(() => setMsg(null), 3000); };
  const on401 = () => { clearToken(); setAuthed(false); };

  const loadDocs = () => api('/oncologists?all=1', { on401 }).then(setDocs).catch((e) => flash(e.message, 'err'));
  const loadServices = () => api('/services?all=1', { on401 }).then(setServices).catch((e) => flash(e.message, 'err'));
  const loadPricing = () => api('/pricing/admin', { on401 }).then((d) => { setPlans(d.plans); setOffers(d.offers); setSettings(d.settings); }).catch((e) => flash(e.message, 'err'));
  const loadBlog = () => api('/blog?all=1', { on401 }).then(setPosts).catch((e) => flash(e.message, 'err'));

  useEffect(() => {
    if (!authed) return;
    api('/auth/me', { on401 }).then((r) => setAdminName(r.admin.email)).catch(() => {});
    loadDocs(); loadServices(); loadPricing(); loadBlog();
  }, [authed]);

  const delPost = (id) => { if (window.confirm('Delete this post? This cannot be undone.')) api(`/blog/${id}`, { method: 'DELETE', on401 }).then(() => { flash('Post deleted.'); loadBlog(); }).catch((e) => flash(e.message, 'err')); };

  const delPlan = (id) => { if (window.confirm('Delete this plan? This cannot be undone.')) api(`/pricing/plans/${id}`, { method: 'DELETE', on401 }).then(() => { flash('Plan deleted.'); loadPricing(); }).catch((e) => flash(e.message, 'err')); };
  const delOffer = (id) => { if (window.confirm('Delete this offer? This cannot be undone.')) api(`/pricing/offers/${id}`, { method: 'DELETE', on401 }).then(() => { flash('Offer deleted.'); loadPricing(); }).catch((e) => flash(e.message, 'err')); };
  const toggleOffer = (o) => api(`/pricing/offers/${o.id}`, { method: 'PUT', on401, body: JSON.stringify({ ...o, active: !o.active }) }).then(() => { flash(o.active ? 'Offer turned off.' : 'Offer is now live.'); loadPricing(); }).catch((e) => flash(e.message, 'err'));
  const saveSettings = (e) => { e.preventDefault(); api('/pricing/settings', { method: 'PUT', on401, body: JSON.stringify(settings) }).then((sv) => { setSettings(sv); flash('Pricing settings saved.'); }).catch((ex) => flash(ex.message, 'err')); };

  const doLogin = (e) => {
    e.preventDefault();
    const email = e.target.email.value.trim().toLowerCase(), password = e.target.password.value;
    api('/auth/login', { method: 'POST', auth: false, body: JSON.stringify({ email, password }) })
      .then((res) => { setToken(res.token); setAdminName(res.admin.name); setAuthed(true); })
      .catch((ex) => setLoginErr(ex.message));
  };
  const logout = () => { clearToken(); setAuthed(false); };

  const delDoc = (id) => { if (window.confirm('Delete this oncologist? This cannot be undone.')) api(`/oncologists/${id}`, { method: 'DELETE', on401 }).then(() => { flash('Oncologist deleted.'); loadDocs(); }).catch((e) => flash(e.message, 'err')); };
  const delSvc = (id) => { if (window.confirm('Delete this service? This cannot be undone.')) api(`/services/${id}`, { method: 'DELETE', on401 }).then(() => { flash('Service deleted.'); loadServices(); }).catch((e) => flash(e.message, 'err')); };

  if (!authed) {
    return (
      <div className="admin-body">
        <div className="admin-login-wrap">
          <form className="admin-login" onSubmit={doLogin}>
            <Mark />
            <h1>Admin Login</h1>
            <p>Manage the DBL International oncologist &amp; service catalogue.</p>
            <label>Email<input type="email" name="email" autoComplete="username" placeholder="admin@dblindia.com" required /></label>
            <label>Password<input type="password" name="password" autoComplete="current-password" placeholder="Your password" required /></label>
            {loginErr && <p className="admin-msg err show">{loginErr}</p>}
            <button type="submit" className="btn btn-primary btn-block">Log in</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-body">
      <header className="admin-topbar">
        <div className="inner">
          <span className="admin-brand">DBL <em>INDIA</em> · Admin</span>
          <span className="admin-user">
            <span>{adminName}</span>
            <a href="/oncologists" className="icon-btn" target="_blank" rel="noreferrer">View site ↗</a>
            <button className="icon-btn" onClick={logout}>Log out</button>
          </span>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-tabs" role="tablist">
          <button className={'admin-tab' + (tab === 'oncologists' ? ' active' : '')} onClick={() => setTab('oncologists')}>Oncologists</button>
          <button className={'admin-tab' + (tab === 'services' ? ' active' : '')} onClick={() => setTab('services')}>Services</button>
          <button className={'admin-tab' + (tab === 'pricing' ? ' active' : '')} onClick={() => setTab('pricing')}>Pricing</button>
          <button className={'admin-tab' + (tab === 'blog' ? ' active' : '')} onClick={() => setTab('blog')}>Blog</button>
        </div>

        {msg && <p className={'admin-msg ' + msg.kind + ' show'}>{msg.m}</p>}

        {tab === 'oncologists' && (
          <section className="admin-panel">
            <div className="admin-head">
              <div><h2>Oncologists</h2><p>{docs.length} oncologist(s) in the panel.</p></div>
              <button className="btn btn-primary" onClick={() => setDocModal(null)}>+ Add Oncologist</button>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Name</th><th>Specialty</th><th>Experience</th><th>Location</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {docs.length === 0 && <tr><td colSpan="6" className="admin-empty">No oncologists yet.</td></tr>}
                  {docs.map((d) => (
                    <tr key={d.id}>
                      <td className="t-name">{d.name}</td><td>{d.specialty}</td><td>{d.experience} yrs</td>
                      <td>{[d.hospital, d.city].filter(Boolean).join(', ') || '—'}</td>
                      <td>{d.active ? <span className="pill on">Active</span> : <span className="pill off">Hidden</span>}{d.featured && <span className="pill feat"> Featured</span>}</td>
                      <td><div className="row-actions"><button className="icon-btn" onClick={() => setDocModal(d)}>Edit</button><button className="icon-btn danger" onClick={() => delDoc(d.id)}>Delete</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'services' && (
          <section className="admin-panel">
            <div className="admin-head">
              <div><h2>Services</h2><p>{services.length} service(s) in the catalogue.</p></div>
              <button className="btn btn-primary" onClick={() => setSvcModal(null)}>+ Add Service</button>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>#</th><th>Title</th><th>Price</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {services.length === 0 && <tr><td colSpan="5" className="admin-empty">No services yet.</td></tr>}
                  {services.map((s) => (
                    <tr key={s.id}>
                      <td>{s.order}</td><td className="t-name">{s.title}</td><td>{rupees(s.price)}{s.priceUnit || ''}</td>
                      <td>{s.active ? <span className="pill on">Active</span> : <span className="pill off">Hidden</span>}{s.featured && <span className="pill feat"> Popular</span>}</td>
                      <td><div className="row-actions"><button className="icon-btn" onClick={() => setSvcModal(s)}>Edit</button><button className="icon-btn danger" onClick={() => delSvc(s.id)}>Delete</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {tab === 'pricing' && (
          <>
            <section className="admin-panel">
              <div className="admin-head"><div><h2>Pricing Settings</h2><p>Controls the Monthly / Yearly toggle and the yearly discount.</p></div></div>
              <form className="admin-form" onSubmit={saveSettings}>
                <div className="admin-form-grid">
                  <label>Yearly discount (%)<input type="number" min="0" max="90" value={settings.yearlyDiscountPct} onChange={(e) => setSettings({ ...settings, yearlyDiscountPct: e.target.value })} /></label>
                  <label>Currency<input value={settings.currency || 'INR'} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} /></label>
                  <div className="checks">
                    <label><input type="checkbox" checked={!!settings.yearlyEnabled} onChange={(e) => setSettings({ ...settings, yearlyEnabled: e.target.checked })} /> Show Monthly / Yearly toggle</label>
                  </div>
                </div>
                <div className="admin-form-actions"><button type="submit" className="btn btn-primary">Save Settings</button></div>
              </form>
            </section>

            <section className="admin-panel">
              <div className="admin-head">
                <div><h2>Plans</h2><p>{plans.length} plan(s). Yearly price = price × 12 − {settings.yearlyDiscountPct}%.</p></div>
                <button className="btn btn-primary" onClick={() => setPlanModal(null)}>+ Add Plan</button>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>#</th><th>Plan</th><th>Price</th><th>Features</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {plans.length === 0 && <tr><td colSpan="6" className="admin-empty">No plans yet.</td></tr>}
                    {plans.map((p) => (
                      <tr key={p.id}>
                        <td>{p.order}</td><td className="t-name">{p.name}</td><td>{rupees(p.priceMonthly)}</td>
                        <td>{(p.features || []).length} feature(s)</td>
                        <td>{p.active ? <span className="pill on">Active</span> : <span className="pill off">Hidden</span>}{p.featured && <span className="pill feat"> Popular</span>}</td>
                        <td><div className="row-actions"><button className="icon-btn" onClick={() => setPlanModal(p)}>Edit</button><button className="icon-btn danger" onClick={() => delPlan(p.id)}>Delete</button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="admin-panel">
              <div className="admin-head">
                <div><h2>Offers</h2><p>Toggle an offer live to show a banner and apply its discount to all plans.</p></div>
                <button className="btn btn-primary" onClick={() => setOfferModal(null)}>+ Add Offer</button>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Title</th><th>Badge</th><th>Discount</th><th>Live</th><th></th></tr></thead>
                  <tbody>
                    {offers.length === 0 && <tr><td colSpan="5" className="admin-empty">No offers yet.</td></tr>}
                    {offers.map((o) => (
                      <tr key={o.id}>
                        <td className="t-name">{o.title}</td><td>{o.badge || '—'}</td><td>{o.discountPct}%</td>
                        <td>
                          <button className={'toggle' + (o.active ? ' on' : '')} onClick={() => toggleOffer(o)} aria-pressed={o.active} title={o.active ? 'Turn off' : 'Turn on'}>
                            <span className="knob" /><span className="toggle-label">{o.active ? 'ON' : 'OFF'}</span>
                          </button>
                        </td>
                        <td><div className="row-actions"><button className="icon-btn" onClick={() => setOfferModal(o)}>Edit</button><button className="icon-btn danger" onClick={() => delOffer(o.id)}>Delete</button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
        {tab === 'blog' && (
          <section className="admin-panel">
            <div className="admin-head">
              <div><h2>Blog / Resources</h2><p>{posts.length} post(s) on the Resources page.</p></div>
              <button className="btn btn-primary" onClick={() => setPostModal(null)}>+ Add Post</button>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>#</th><th>Title</th><th>Category</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {posts.length === 0 && <tr><td colSpan="5" className="admin-empty">No posts yet.</td></tr>}
                  {posts.map((p) => (
                    <tr key={p.id}>
                      <td>{p.order}</td><td className="t-name">{p.title}</td><td>{p.category}</td>
                      <td>{p.active ? <span className="pill on">Active</span> : <span className="pill off">Hidden</span>}{p.isVideo && <span className="pill feat"> Video</span>}</td>
                      <td><div className="row-actions"><button className="icon-btn" onClick={() => setPostModal(p)}>Edit</button><button className="icon-btn danger" onClick={() => delPost(p.id)}>Delete</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {docModal !== undefined && <OncologistModal doc={docModal} onClose={() => setDocModal(undefined)} onSaved={(m) => { setDocModal(undefined); flash(m); loadDocs(); }} />}
      {svcModal !== undefined && <ServiceModal svc={svcModal} onClose={() => setSvcModal(undefined)} onSaved={(m) => { setSvcModal(undefined); flash(m); loadServices(); }} />}
      {planModal !== undefined && <PlanModal plan={planModal} onClose={() => setPlanModal(undefined)} onSaved={(m) => { setPlanModal(undefined); flash(m); loadPricing(); }} />}
      {offerModal !== undefined && <OfferModal offer={offerModal} onClose={() => setOfferModal(undefined)} onSaved={(m) => { setOfferModal(undefined); flash(m); loadPricing(); }} />}
      {postModal !== undefined && <BlogModal post={postModal} onClose={() => setPostModal(undefined)} onSaved={(m) => { setPostModal(undefined); flash(m); loadBlog(); }} />}
    </div>
  );
}
