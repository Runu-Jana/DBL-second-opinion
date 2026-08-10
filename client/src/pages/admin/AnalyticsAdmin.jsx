import { useEffect, useState } from 'react';
import { api, rupees } from '../../api.js';
import { RefreshButton } from '../../components/AdminFields.jsx';

const countBy = (arr, key) => arr.reduce((m, x) => { const k = x[key] || '—'; m[k] = (m[k] || 0) + 1; return m; }, {});
const sumBy = (arr, pred, key = 'amount') => arr.filter(pred).reduce((s, x) => s + (x[key] || 0), 0);

function Breakdown({ title, data, tones }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0) || 1;
  const palette = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#0e9f8e', '#64748b'];
  return (
    <section className="adm-card">
      <div className="adm-card-head"><h2>{title}</h2></div>
      <ul className="adm-bd">
        {Object.entries(data).map(([k, v], i) => (
          <li key={k}>
            <div className="adm-bd-top"><span>{k}</span><strong>{v}</strong></div>
            <div className="adm-bd-track"><span className="adm-bd-fill" style={{ width: `${Math.round((v / total) * 100)}%`, background: (tones && tones[k]) || palette[i % palette.length] }} /></div>
          </li>
        ))}
        {Object.keys(data).length === 0 && <li className="adm-bd-empty">No data yet.</li>}
      </ul>
    </section>
  );
}

export default function AnalyticsAdmin({ flash, on401 }) {
  const [d, setD] = useState(null);
  const load = () => {
    Promise.all([
      api('/patients', { on401 }).catch(() => []),
      api('/appointments', { on401 }).catch(() => []),
      api('/consultations', { on401 }).catch(() => []),
      api('/invoices', { on401 }).catch(() => []),
      api('/reports', { on401 }).catch(() => []),
    ]).then(([patients, appointments, consultations, invoices, reports]) => setD({ patients, appointments, consultations, invoices, reports }))
      .catch((e) => flash(e.message, 'err'));
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  if (!d) return <div className="adm-module"><div className="adm-page-head"><div><h1>AI &amp; Analytics</h1><p>Loading insights…</p></div></div></div>;

  const collected = sumBy(d.invoices, (i) => i.status === 'Paid');
  const outstanding = sumBy(d.invoices, (i) => i.status === 'Pending' || i.status === 'Overdue');
  const tiles = [
    { label: 'Total Patients', value: d.patients.length },
    { label: 'Appointments', value: d.appointments.length },
    { label: 'Consultations', value: d.consultations.length },
    { label: 'Revenue Collected', value: rupees(collected) },
    { label: 'Outstanding', value: rupees(outstanding) },
    { label: 'Reports Pending', value: d.reports.filter((r) => r.status === 'Pending Review').length },
  ];

  return (
    <div className="adm-module">
      <div className="adm-page-head">
        <div><h1>AI &amp; Analytics</h1><p>Live insights computed across your records.</p></div>
        <div className="adm-head-actions">
          <span className="adm-stat-delta live"><span className="adm-live-dot" />Live data</span>
          <RefreshButton onClick={load} />
        </div>
      </div>

      <div className="adm-analytics-tiles">
        {tiles.map((t) => (
          <div className="adm-card adm-atile" key={t.label}>
            <span className="adm-atile-label">{t.label}</span>
            <strong className="adm-atile-value">{t.value}</strong>
          </div>
        ))}
      </div>

      <div className="adm-row r4">
        <Breakdown title="Patients by Status" data={countBy(d.patients, 'status')} />
        <Breakdown title="Appointments by Status" data={countBy(d.appointments, 'status')} />
      </div>
      <div className="adm-row r4">
        <Breakdown title="Consultations by Status" data={countBy(d.consultations, 'status')} />
        <Breakdown title="Invoices by Status" data={countBy(d.invoices, 'status')} />
      </div>
    </div>
  );
}
