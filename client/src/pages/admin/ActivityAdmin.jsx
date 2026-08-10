import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { RefreshButton } from '../../components/AdminFields.jsx';

// Relative time for live entries (seeded rows carry their own `time` string).
function rel(iso) {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '—';
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 45) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h > 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d > 1 ? 's' : ''} ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Read-only log viewer — used for both System Activity (kind="activity") and Audit Logs (kind="audit").
export default function ActivityAdmin({ kind = 'activity', title, subtitle, flash, on401 }) {
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    const params = new URLSearchParams({ kind });
    if (q.trim()) params.set('q', q.trim());
    setLoading(true);
    api('/activity?' + params.toString(), { on401 })
      .then((d) => { setList(d); setLoading(false); })
      .catch((e) => { flash(e.message, 'err'); setLoading(false); });
  };
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q, kind]); // eslint-disable-line

  return (
    <div className="adm-module">
      <div className="adm-page-head"><div><h1>{title}</h1><p>{subtitle} — {list.length} entries.</p></div><RefreshButton onClick={load} /></div>

      <div className="adm-toolbar">
        <div className="adm-search-box">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actor, action or target…" />
        </div>
      </div>

      <section className="admin-panel">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Actor</th><th>Action</th><th>Target</th><th>Category</th><th>Time</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan="5" className="admin-empty">Loading…</td></tr>}
              {!loading && list.length === 0 && <tr><td colSpan="5" className="admin-empty">No entries found.</td></tr>}
              {!loading && list.map((e) => (
                <tr key={e.id}>
                  <td className="t-name">{e.actor || 'System'}</td>
                  <td>{e.action}</td>
                  <td>{e.target || '—'}</td>
                  <td>{e.category ? <span className="adm-badge gray">{e.category}</span> : '—'}</td>
                  <td>{e.time || rel(e.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
