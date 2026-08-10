import { useEffect, useState } from 'react';
import { api, rupees } from '../api.js';
import { Select, DateField, RefreshButton } from './AdminFields.jsx';

const withCurrent = (opts, current) => (current && !opts.some((o) => o.value === current) ? [{ value: current, label: current }, ...opts] : opts);

function Field({ field, f, setF, patients, staff }) {
  const v = f[field.key] ?? '';
  const set = (val) => setF({ ...f, [field.key]: val });
  if (field.type === 'select') return <Select value={v} onChange={set} options={field.options} placeholder={field.placeholder || 'Select…'} />;
  if (field.type === 'date') return <DateField value={v} onChange={set} />;
  if (field.type === 'textarea') return <textarea value={v} onChange={(e) => set(e.target.value)} placeholder={field.placeholder} />;
  if (field.type === 'number') return <input type="number" min="0" value={v} onChange={(e) => set(e.target.value)} placeholder={field.placeholder} />;
  if (field.type === 'patient') {
    const opts = withCurrent(patients.map((p) => ({ value: p.name, label: p.uhid ? `${p.name} · ${p.uhid}` : p.name })), v);
    return <Select value={v} onChange={(val) => {
      const p = patients.find((x) => x.name === val);
      const extra = {};
      if (p) { extra.patientUhid = p.uhid || ''; if (field.autofill && p.cancerType) extra[field.autofill] = p.cancerType; }
      setF({ ...f, [field.key]: val, ...extra });
    }} options={opts} placeholder="Select patient" />;
  }
  if (field.type === 'doctor') {
    const opts = withCurrent(staff.map((s) => ({ value: s.name, label: `${s.name} · ${s.role}` })), v);
    return <Select value={v} onChange={set} options={opts} placeholder="Select doctor" />;
  }
  return <input value={v} onChange={(e) => set(e.target.value)} placeholder={field.placeholder} />;
}

function CrudModal({ cfg, item, patients, staff, onClose, onSaved, on401 }) {
  const empty = cfg.fields.reduce((a, fl) => ({ ...a, [fl.key]: fl.type === 'number' ? 0 : '' }), {});
  cfg.hidden && cfg.hidden.forEach((k) => { empty[k] = ''; });
  const [f, setF] = useState(empty);
  const [err, setErr] = useState('');
  useEffect(() => { setF(item ? { ...empty, ...item } : { ...empty, ...(cfg.defaults || {}) }); setErr(''); }, [item]); // eslint-disable-line

  const submit = (e) => {
    e.preventDefault();
    const missing = cfg.fields.find((fl) => fl.required && !String(f[fl.key] ?? '').trim());
    if (missing) return setErr(`${missing.label.replace(' *', '')} is required.`);
    const req = item
      ? api(`${cfg.endpoint}/${item.id}`, { method: 'PUT', on401, body: JSON.stringify(f) })
      : api(cfg.endpoint, { method: 'POST', on401, body: JSON.stringify(f) });
    req.then(() => onSaved(item ? `${cfg.noun} updated.` : `${cfg.noun} added.`)).catch((ex) => setErr(ex.message));
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-wide">
        <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        <div className="modal-head left"><h3>{item ? `Edit ${cfg.noun}` : `Add ${cfg.noun}`}</h3>{cfg.modalSub && <p className="modal-sub">{cfg.modalSub}</p>}</div>
        <form className="admin-form" onSubmit={submit}>
          <div className="admin-form-grid">
            {cfg.fields.map((fl) => (
              <label key={fl.key} className={fl.full ? 'full' : ''}>{fl.label}
                <Field field={fl} f={f} setF={setF} patients={patients} staff={staff} />
              </label>
            ))}
          </div>
          {err && <p className="admin-msg err show">{err}</p>}
          <div className="admin-form-actions"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary">Save</button></div>
        </form>
      </div>
    </div>
  );
}

const cellValue = (col, row) => {
  if (col.render) return col.render(row);
  const v = row[col.key];
  if (col.money) return v ? rupees(v) : '—';
  if (col.badge) return <span className={'adm-badge ' + (col.badge[v] || 'blue')}>{v}</span>;
  if (col.sub) return <span className="t-name">{v || '—'}{row[col.sub] ? <span className="t-sub"> · {row[col.sub]}</span> : ''}</span>;
  return v || v === 0 ? v : '—';
};

export default function AdminCrud({ cfg, flash, on401 }) {
  const [list, setList] = useState([]);
  const [patients, setPatients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [modal, setModal] = useState(undefined);
  const [loading, setLoading] = useState(true);

  const load = () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (status) params.set('status', status);
    setLoading(true);
    api(`${cfg.endpoint}?` + params.toString(), { on401 })
      .then((d) => { setList(d); setLoading(false); })
      .catch((e) => { flash(e.message, 'err'); setLoading(false); });
  };
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q, status]); // eslint-disable-line
  useEffect(() => {
    if (cfg.pickers?.includes('patients')) api('/patients', { on401 }).then(setPatients).catch(() => {});
    if (cfg.pickers?.includes('staff')) api('/staff', { on401 }).then(setStaff).catch(() => {});
  }, [cfg.endpoint]); // eslint-disable-line

  const del = (row) => {
    if (!window.confirm(`Delete this ${cfg.noun.toLowerCase()}? This cannot be undone.`)) return;
    api(`${cfg.endpoint}/${row.id}`, { method: 'DELETE', on401 }).then(() => { flash(`${cfg.noun} deleted.`); load(); }).catch((e) => flash(e.message, 'err'));
  };

  return (
    <div className="adm-module">
      <div className="adm-page-head">
        <div><h1>{cfg.title}</h1><p>{cfg.subtitle} — {list.length} shown.</p></div>
        <div className="adm-head-actions">
          <RefreshButton onClick={load} />
          <button className="btn btn-primary" onClick={() => setModal(null)}>+ {cfg.addLabel || `Add ${cfg.noun}`}</button>
        </div>
      </div>

      {cfg.stats && !loading && (
        <div className="adm-crud-stats">
          {cfg.stats(list).map((s) => (
            <div className={'adm-crud-stat' + (s.tone ? ' ' + s.tone : '')} key={s.label}>
              <span className="adm-crud-stat-val">{s.value}</span>
              <span className="adm-crud-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="adm-toolbar">
        <div className="adm-search-box">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={cfg.searchPlaceholder || 'Search…'} />
        </div>
        {cfg.statuses && (
          <div className="adm-toolbar-filter">
            <Select value={status} onChange={setStatus} options={[{ value: '', label: 'All statuses' }, ...cfg.statuses.map((s) => ({ value: s, label: s }))]} />
          </div>
        )}
      </div>

      <section className="admin-panel">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr>{cfg.columns.map((c) => <th key={c.key}>{c.label}</th>)}<th></th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={cfg.columns.length + 1} className="admin-empty">Loading…</td></tr>}
              {!loading && list.length === 0 && <tr><td colSpan={cfg.columns.length + 1} className="admin-empty">No records found.</td></tr>}
              {!loading && list.map((row) => (
                <tr key={row.id}>
                  {cfg.columns.map((c) => <td key={c.key} className={c.sub ? '' : (c.className || '')}>{cellValue(c, row)}</td>)}
                  <td><div className="row-actions"><button className="icon-btn" onClick={() => setModal(row)}>Edit</button><button className="icon-btn danger" onClick={() => del(row)}>Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modal !== undefined && <CrudModal cfg={cfg} item={modal} patients={patients} staff={staff} on401={on401} onClose={() => setModal(undefined)} onSaved={(m) => { setModal(undefined); flash(m); load(); }} />}
    </div>
  );
}
