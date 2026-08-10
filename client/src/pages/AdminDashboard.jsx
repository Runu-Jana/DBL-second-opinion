import { useState, useEffect } from 'react';
import { api, rupees } from '../api.js';
import { RefreshButton } from '../components/AdminFields.jsx';

const RTONE = { 'New Patient': 'rose', 'Under Treatment': 'blue', 'Follow-up': 'green', Completed: 'green', Discharged: 'gray' };

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
const Ico = {
  patients: <svg viewBox="0 0 24 24" {...s}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5.2 6-5.2s6 1.9 6 5.2M16 4.2a3.2 3.2 0 0 1 0 6.2M18 20c0-2.6-1-4.3-2.6-5.2" /></svg>,
  treat: <svg viewBox="0 0 24 24" {...s}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M12 8v6M9 11h6" /></svg>,
  appt: <svg viewBox="0 0 24 24" {...s}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>,
  report: <svg viewBox="0 0 24 24" {...s}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M9.5 12h5M9.5 15h5" /></svg>,
  rupee: <svg viewBox="0 0 24 24" {...s}><path d="M7 5h10M7 9h10M15 5c0 4-3.5 5-8 5l6 9" /></svg>,
  up: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 15l6-6 6 6" /></svg>,
  down: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>,
  addUser: <svg viewBox="0 0 24 24" {...s}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5.2 6-5.2 1 0 2 .2 2.8.5M17 11v6M14 14h6" /></svg>,
  addDoc: <svg viewBox="0 0 24 24" {...s}><path d="M9 3h6v3l2 1v14H7V7l2-1Z" /><path d="M12 11v4M10 13h4" /></svg>,
  upload: <svg viewBox="0 0 24 24" {...s}><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3M12 4v11M8 8l4-4 4 4" /></svg>,
  megaphone: <svg viewBox="0 0 24 24" {...s}><path d="M3 11v2a1 1 0 0 0 1 1h2l9 5V5L6 10H4a1 1 0 0 0-1 1ZM18 8a4 4 0 0 1 0 8" /></svg>,
  gear: <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></svg>,
  file: <svg viewBox="0 0 24 24" {...s}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /></svg>,
  alert: <svg viewBox="0 0 24 24" {...s}><path d="M12 3 2 20h20L12 3Z" /><path d="M12 9v5M12 17h.01" /></svg>,
  info: <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4 10-10" /></svg>,
  dot: <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4" /></svg>,
};

/* ---------- mock data ---------- */
const STATS = [
  { key: 'patients', label: 'Total Patients', value: '12,842', delta: '+18.5%', dir: 'up', note: 'from last month', ico: Ico.patients, tone: 'teal', to: 'patients' },
  { key: 'treat', label: 'Active Treatments', value: '3,248', delta: '+14.2%', dir: 'up', note: 'from last month', ico: Ico.treat, tone: 'green', to: 'treatment' },
  { key: 'appt', label: 'Appointments Today', value: '158', delta: '+8.7%', dir: 'up', note: 'from yesterday', ico: Ico.appt, tone: 'blue', to: 'appointments' },
  { key: 'report', label: 'Reports Generated', value: '5,672', delta: '+21.3%', dir: 'up', note: 'from last month', ico: Ico.report, tone: 'violet', to: 'reports' },
  { key: 'rev', label: 'Revenue (This Month)', value: '₹2,45,78,320', delta: '+16.4%', dir: 'up', note: 'from last month', ico: Ico.rupee, tone: 'rose', to: 'billing' },
];

const OVERVIEW = [
  { label: 'New Patients', value: '2,305', pct: 17.9, color: '#3b82f6' },
  { label: 'Under Treatment', value: '5,768', pct: 44.9, color: '#10b981' },
  { label: 'Follow-up', value: '3,453', pct: 26.9, color: '#8b5cf6' },
  { label: 'Completed', value: '1,316', pct: 10.3, color: '#f59e0b' },
];

const TREAT_SERIES = [
  { label: 'Chemotherapy', color: '#8b5cf6', pts: [40, 55, 48, 62, 58, 70, 66] },
  { label: 'Radiotherapy', color: '#3b82f6', pts: [30, 38, 34, 44, 40, 50, 46] },
  { label: 'Immunotherapy', color: '#10b981', pts: [18, 24, 20, 28, 25, 32, 30] },
  { label: 'Targeted Therapy', color: '#f59e0b', pts: [12, 16, 14, 20, 18, 22, 21] },
];
const TREAT_DAYS = ['10 May', '11 May', '12 May', '13 May', '14 May', '15 May', '16 May'];

const ALERTS = [
  { tone: 'high', label: 'High', text: '5 Drug interaction alerts require immediate review', time: '10 min ago', ico: Ico.alert },
  { tone: 'med', label: 'Medium', text: '12 Appointments pending confirmation', time: '25 min ago', ico: Ico.alert },
  { tone: 'info', label: 'Info', text: 'Lab integration service is running slowly', time: '40 min ago', ico: Ico.info },
];

const APPTS = [
  { name: 'Rahul Sharma', type: 'OPD Follow-up', status: 'Upcoming', tone: 'blue' },
  { name: 'Neha Verma', type: 'Chemotherapy Review', status: 'Upcoming', tone: 'blue' },
  { name: 'Arjun Mehta', type: 'Second Opinion', status: 'Confirmed', tone: 'green' },
  { name: 'Pooja Singh', type: 'New Consultation', status: 'Upcoming', tone: 'blue' },
  { name: 'Rajesh Kumar', type: 'Treatment Plan Review', status: 'Pending', tone: 'amber' },
];

const REPORTS = [
  { label: 'CT Scan Reports', value: '1,245' },
  { label: 'PET CT Reports', value: '938' },
  { label: 'Histopathology Reports', value: '1,563' },
  { label: 'Blood Reports', value: '985' },
  { label: 'Treatment Summaries', value: '941' },
];

const REVENUE_BARS = [22, 30, 26, 34, 28, 33, 31];

const QUICK = [
  { label: 'Add New Patient', ico: Ico.addUser, to: 'patients' },
  { label: 'Add New Doctor', ico: Ico.addDoc, to: 'staff' },
  { label: 'Upload Report', ico: Ico.upload, to: 'reports' },
  { label: 'Create Announcement', ico: Ico.megaphone, to: 'communication' },
  { label: 'System Settings', ico: Ico.gear, to: 'settings' },
  { label: 'Generate Report', ico: Ico.file, to: 'reports' },
];

const PATIENTS = [
  { name: 'Rahul Sharma', uhid: 'DBL125456', cancer: 'Colon Cancer', stage: 'Stage II', status: 'Under Treatment', tone: 'blue', visit: '16 May 2024' },
  { name: 'Neha Verma', uhid: 'DBL125457', cancer: 'Breast Cancer', stage: 'Stage IIA', status: 'Under Treatment', tone: 'blue', visit: '16 May 2024' },
  { name: 'Arjun Mehta', uhid: 'DBL125458', cancer: 'Lung Cancer', stage: 'Stage IIIA', status: 'Under Treatment', tone: 'blue', visit: '15 May 2024' },
  { name: 'Pooja Singh', uhid: 'DBL125459', cancer: 'Ovarian Cancer', stage: 'Stage IIC', status: 'New Patient', tone: 'rose', visit: '15 May 2024' },
  { name: 'Rajesh Kumar', uhid: 'DBL125460', cancer: 'Prostate Cancer', stage: 'Stage I', status: 'Follow-up', tone: 'green', visit: '14 May 2024' },
];

const ANALYTICS = [
  { label: 'Total Users', value: '18,756', delta: '+12.7%', dir: 'up' },
  { label: 'Active Users', value: '6,248', delta: '+15.3%', dir: 'up' },
  { label: 'Total Logins', value: '54,892', delta: '+18.6%', dir: 'up' },
  { label: 'Avg. Session Time', value: '24m 35s', delta: '+9.4%', dir: 'up' },
];
const ANALYTICS_LINE = [30, 42, 38, 55, 48, 60, 52, 68, 62, 75, 70, 82];

const STATUS = [
  { label: 'Application Server', state: 'Operational' },
  { label: 'Database Server', state: 'Operational' },
  { label: 'AI Services', state: 'Operational' },
  { label: 'Email Service', state: 'Operational' },
  { label: 'SMS Gateway', state: 'Operational' },
  { label: 'Payment Gateway', state: 'Operational' },
];

const ACTIVITY = [
  { text: 'Dr. Neha Verma generated a new report', time: '2 min ago' },
  { text: 'New patient Rahul Sharma registered', time: '15 min ago' },
  { text: 'System backup completed successfully', time: '30 min ago' },
  { text: 'Admin User updated system settings', time: '45 min ago' },
  { text: 'Payment received from Neha Verma', time: '1 hour ago' },
];

/* ---------- donut ---------- */
function Donut({ segments, total }) {
  let acc = 0;
  const stops = segments.map((sg) => {
    const from = acc; acc += sg.pct;
    return `${sg.color} ${from}% ${acc}%`;
  }).join(', ');
  return (
    <div className="adm-donut" style={{ background: `conic-gradient(${stops})` }}>
      <div className="adm-donut-hole">
        <strong>{total}</strong>
        <span>Total</span>
      </div>
    </div>
  );
}

/* ---------- multi-series area chart (SVG) ---------- */
function AreaChart({ series, labels }) {
  const W = 640, H = 210, PL = 34, PB = 24, PT = 10;
  const max = Math.max(...series.flatMap((s0) => s0.pts)) * 1.15;
  const n = labels.length;
  const x = (i) => PL + (i * (W - PL - 8)) / (n - 1);
  const y = (v) => PT + (1 - v / max) * (H - PT - PB);
  const yTicks = [0, 500, 1000, 1500, 2000];
  const tickMax = 2000;
  const ty = (v) => PT + (1 - v / tickMax) * (H - PT - PB);
  return (
    <svg className="adm-area" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Treatment overview">
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={PL} y1={ty(v)} x2={W - 8} y2={ty(v)} stroke="var(--line)" strokeWidth="1" />
          <text x={PL - 8} y={ty(v) + 4} textAnchor="end" className="adm-axis">{v >= 1000 ? v / 1000 + 'K' : v}</text>
        </g>
      ))}
      {series.map((sr) => {
        const line = sr.pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
        const area = `${line} L ${x(n - 1)} ${H - PB} L ${x(0)} ${H - PB} Z`;
        return (
          <g key={sr.label}>
            <path d={area} fill={sr.color} opacity="0.08" />
            <path d={line} fill="none" stroke={sr.color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
          </g>
        );
      })}
      {labels.map((lb, i) => <text key={lb} x={x(i)} y={H - 6} textAnchor="middle" className="adm-axis">{lb}</text>)}
    </svg>
  );
}

/* ---------- line chart (SVG) ---------- */
function LineChart({ pts }) {
  const W = 620, H = 190, PL = 30, PB = 22, PT = 10;
  const max = Math.max(...pts) * 1.15;
  const n = pts.length;
  const x = (i) => PL + (i * (W - PL - 8)) / (n - 1);
  const y = (v) => PT + (1 - v / max) * (H - PT - PB);
  const line = pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
  const area = `${line} L ${x(n - 1)} ${H - PB} L ${x(0)} ${H - PB} Z`;
  const months = ['10 May', '12 May', '14 May', '16 May'];
  return (
    <svg className="adm-line" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Platform analytics">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={PL} y1={PT + f * (H - PT - PB)} x2={W - 8} y2={PT + f * (H - PT - PB)} stroke="var(--line)" strokeWidth="1" />
      ))}
      <path d={area} fill="#6366f1" opacity="0.1" />
      <path d={line} fill="none" stroke="#6366f1" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      {months.map((m, i) => <text key={m} x={PL + (i * (W - PL - 8)) / 3} y={H - 4} textAnchor="middle" className="adm-axis">{m}</text>)}
    </svg>
  );
}

export default function AdminDashboard({ adminName, onNavigate, on401 }) {
  const name = adminName || 'Admin User';
  const go = (s) => onNavigate && onNavigate(s);

  const [patients, setPatients] = useState(null); // null until loaded; falls back to mock on failure
  const [appts, setAppts] = useState(null);
  const [reports, setReports] = useState(null);
  const [plans, setPlans] = useState(null);
  const [invoices, setInvoices] = useState(null);
  const [meds, setMeds] = useState(null);
  const load = () => {
    api('/patients', { on401 }).then(setPatients).catch(() => {});
    api('/appointments', { on401 }).then(setAppts).catch(() => {});
    api('/reports', { on401 }).then(setReports).catch(() => {});
    api('/treatment-plans', { on401 }).then(setPlans).catch(() => {});
    api('/invoices', { on401 }).then(setInvoices).catch(() => {});
    api('/medications', { on401 }).then(setMeds).catch(() => {});
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const ATONE = { Upcoming: 'blue', Confirmed: 'green', Pending: 'amber', Completed: 'teal', Cancelled: 'rose' };
  const recentAppts = appts ? appts.slice(0, 5).map((a) => ({ name: a.patientName, type: a.type, status: a.status, tone: ATONE[a.status] || 'blue' })) : APPTS;

  const total = patients ? patients.length : null;
  const cnt = (st) => (patients ? patients.filter((p) => p.status === st).length : 0);

  // ---- live stat cards ----
  const liveVal = {
    patients: total,
    treat: plans ? plans.filter((p) => p.status === 'Active').length : null,
    appt: appts ? appts.filter((a) => ['Upcoming', 'Confirmed', 'Pending'].includes(a.status)).length : null,
    report: reports ? reports.length : null,
    rev: invoices ? invoices.filter((i) => i.status === 'Paid').reduce((s, i) => s + (i.amount || 0), 0) : null,
  };
  const liveLabel = { appt: 'Upcoming Appointments', report: 'Reports on File', treat: 'Active Treatments' };
  const statsView = STATS.map((s0) => {
    const v = liveVal[s0.key];
    if (v == null) return s0;
    return { ...s0, value: s0.key === 'rev' ? rupees(v) : v.toLocaleString('en-IN'), label: liveLabel[s0.key] || s0.label, live: true };
  });

  const overviewView = patients
    ? [
        { label: 'New Patients', value: cnt('New Patient'), color: '#3b82f6' },
        { label: 'Under Treatment', value: cnt('Under Treatment'), color: '#10b981' },
        { label: 'Follow-up', value: cnt('Follow-up'), color: '#8b5cf6' },
        { label: 'Completed', value: cnt('Completed'), color: '#f59e0b' },
      ].map((o) => ({ ...o, pct: total ? Math.round((o.value / total) * 1000) / 10 : 0, value: String(o.value) }))
    : OVERVIEW;
  const donutTotal = total != null ? total.toLocaleString('en-IN') : '12,842';
  const recent = patients
    ? patients.slice(0, 5).map((p) => ({ name: p.name, uhid: p.uhid, cancer: p.cancerType || '—', stage: p.stage || '—', status: p.status, tone: RTONE[p.status] || 'blue', visit: p.lastVisit || '—' }))
    : PATIENTS;

  // ---- live Reports Overview (grouped by type) ----
  const reportsView = reports && reports.length
    ? Object.entries(reports.reduce((m, r) => { const k = r.type || 'Other'; m[k] = (m[k] || 0) + 1; return m; }, {}))
        .sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value: String(value) }))
    : REPORTS;

  // ---- live Revenue ----
  const collected = invoices ? invoices.filter((i) => i.status === 'Paid').reduce((s, i) => s + (i.amount || 0), 0) : null;
  const outstanding = invoices ? invoices.filter((i) => ['Pending', 'Overdue'].includes(i.status)).reduce((s, i) => s + (i.amount || 0), 0) : null;

  // ---- live System Alerts (derived from real data) ----
  const liveAlerts = [];
  if (reports) { const t = reports.filter((r) => !r.category).length; if (t) liveAlerts.push({ tone: 'high', label: 'Triage', text: `${t} report${t > 1 ? 's' : ''} awaiting triage`, time: 'now', ico: Ico.alert, to: 'reports' }); }
  if (appts) { const p = appts.filter((a) => a.status === 'Pending').length; if (p) liveAlerts.push({ tone: 'med', label: 'Appointments', text: `${p} appointment${p > 1 ? 's' : ''} pending confirmation`, time: 'now', ico: Ico.alert, to: 'appointments' }); }
  if (meds) { const low = meds.filter((m) => ['Low Stock', 'Out of Stock'].includes(m.status)).length; if (low) liveAlerts.push({ tone: 'info', label: 'Pharmacy', text: `${low} medication${low > 1 ? 's' : ''} low or out of stock`, time: 'now', ico: Ico.info, to: 'pharmacy' }); }
  if (invoices) { const od = invoices.filter((i) => i.status === 'Overdue').length; if (od) liveAlerts.push({ tone: 'med', label: 'Billing', text: `${od} invoice${od > 1 ? 's' : ''} overdue`, time: 'now', ico: Ico.alert, to: 'billing' }); }
  const alertsView = liveAlerts.length ? liveAlerts : (reports || appts || meds ? [{ tone: 'info', label: 'All clear', text: 'No alerts right now — everything looks healthy.', time: 'now', ico: Ico.check }] : ALERTS);

  return (
    <div className="adm-dash">
      <div className="adm-page-head">
        <div>
          <h1>Welcome back, {name}! <span role="img" aria-label="wave">👋</span></h1>
          <p>Here's what's happening in DBL Oncology Care Platform today.</p>
        </div>
        <div className="adm-head-actions">
          <button type="button" className="adm-daterange">
            <svg viewBox="0 0 24 24" {...s} width="16" height="16"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>
            01 May 2024 - 16 May 2024
            {AI_caret}
          </button>
          <RefreshButton onClick={load} />
        </div>
      </div>

      {/* stat cards */}
      <div className="adm-stats">
        {statsView.map((st) => (
          <button type="button" className="adm-stat" key={st.key} onClick={() => go(st.to)}>
            <span className={'adm-stat-ico ' + st.tone}>{st.ico}</span>
            <span className="adm-stat-label">{st.label}</span>
            <strong className="adm-stat-value">{st.value}</strong>
            {st.live
              ? <span className="adm-stat-delta live"><span className="adm-live-dot" />Live data</span>
              : <span className={'adm-stat-delta ' + st.dir}>{st.dir === 'up' ? Ico.up : Ico.down}{st.delta}<em>{st.note}</em></span>}
          </button>
        ))}
      </div>

      {/* row 1: overview / treatment / alerts */}
      <div className="adm-row r1">
        <section className="adm-card">
          <div className="adm-card-head"><h2>Patient Overview</h2></div>
          <div className="adm-overview">
            <Donut segments={overviewView} total={donutTotal} />
            <ul className="adm-legend">
              {overviewView.map((o) => (
                <li key={o.label}><span className="adm-legend-dot" style={{ background: o.color }} />
                  <span className="adm-legend-label">{o.label}</span>
                  <span className="adm-legend-val">{o.value} <em>({o.pct}%)</em></span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="adm-card">
          <div className="adm-card-head"><h2>Treatment Overview</h2><button type="button" className="adm-link" onClick={() => go('treatment')}>View Report</button></div>
          <div className="adm-chart-legend">
            {TREAT_SERIES.map((t) => <span key={t.label}><i style={{ background: t.color }} />{t.label}</span>)}
          </div>
          <AreaChart series={TREAT_SERIES} labels={TREAT_DAYS} />
        </section>

        <section className="adm-card">
          <div className="adm-card-head"><h2>System Alerts</h2><button type="button" className="adm-link" onClick={() => go('system-activity')}>View All</button></div>
          <ul className="adm-alerts">
            {alertsView.map((a, i) => (
              <li key={i} className={'adm-alert ' + a.tone + (a.to ? ' clickable' : '')} onClick={a.to ? () => go(a.to) : undefined}>
                <span className="adm-alert-ico">{a.ico}</span>
                <div className="adm-alert-body">
                  <div className="adm-alert-top"><span className={'adm-alert-tag ' + a.tone}>{a.label}</span><span className="adm-alert-time">{a.time}</span></div>
                  <p>{a.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* row 2: appointments / reports / revenue */}
      <div className="adm-row r2">
        <section className="adm-card">
          <div className="adm-card-head"><h2>Recent Appointments</h2><button type="button" className="adm-link" onClick={() => go('appointments')}>View All</button></div>
          <ul className="adm-list">
            {recentAppts.map((a, i) => (
              <li key={i} className="adm-appt-row">
                <span className="adm-mini-avatar">{a.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
                <div className="adm-appt-info"><strong>{a.name}</strong><span>{a.type}</span></div>
                <span className={'adm-badge ' + a.tone}>{a.status}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="adm-card">
          <div className="adm-card-head"><h2>Reports Overview</h2><button type="button" className="adm-link" onClick={() => go('reports')}>View All</button></div>
          <ul className="adm-list">
            {reportsView.map((r, i) => (
              <li key={i} className="adm-report-row">
                <span className="adm-report-ico">{Ico.report}</span>
                <span className="adm-report-label">{r.label}</span>
                <span className="adm-report-val">{r.value}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="adm-card">
          <div className="adm-card-head"><h2>Revenue Overview</h2><button type="button" className="adm-link" onClick={() => go('billing')}>View Financial Report</button></div>
          <div className="adm-revenue">
            <strong>{collected != null ? rupees(collected) : rupees(24578320)}</strong>
            <span className="adm-rev-sub">Collected {collected != null
              ? <em className="up"><span className="adm-live-dot" />Live · {outstanding ? `${rupees(outstanding)} outstanding` : 'nothing outstanding'}</em>
              : <em className="up">{Ico.up}+16.4% from last month</em>}</span>
          </div>
          <div className="adm-bars">
            {REVENUE_BARS.map((h, i) => (
              <span className="adm-bar-col" key={i}><span className="adm-bar" style={{ height: h * 3 + 'px' }} /><em>{TREAT_DAYS[i].split(' ')[0]}</em></span>
            ))}
          </div>
        </section>
      </div>

      {/* quick actions */}
      <section className="adm-card">
        <div className="adm-card-head"><h2>Admin Quick Actions</h2></div>
        <div className="adm-quick">
          {QUICK.map((q) => (
            <button type="button" className="adm-quick-btn" key={q.label} onClick={() => go(q.to)}><span className="adm-quick-ico">{q.ico}</span>{q.label}</button>
          ))}
        </div>
      </section>

      {/* row 3: recent patients / platform analytics */}
      <div className="adm-row r3">
        <section className="adm-card">
          <div className="adm-card-head"><h2>Recent Patients</h2><button type="button" className="adm-link" onClick={() => go('patients')}>View All</button></div>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>Patient Name</th><th>UHID</th><th>Cancer Type</th><th>Stage</th><th>Status</th><th>Last Visit</th></tr></thead>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.uhid}>
                    <td className="adm-td-name"><span className="adm-mini-avatar sm">{p.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>{p.name}</td>
                    <td className="mono">{p.uhid}</td>
                    <td>{p.cancer}</td>
                    <td>{p.stage}</td>
                    <td><span className={'adm-badge ' + p.tone}>{p.status}</span></td>
                    <td>{p.visit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="adm-card">
          <div className="adm-card-head"><h2>Platform Analytics</h2><span className="adm-chip">This Month</span></div>
          <div className="adm-analytics-grid">
            {ANALYTICS.map((a) => (
              <div className="adm-analytic" key={a.label}>
                <span className="adm-analytic-label">{a.label}</span>
                <strong>{a.value}</strong>
                <span className={'adm-stat-delta ' + a.dir}>{a.dir === 'up' ? Ico.up : Ico.down}{a.delta}</span>
              </div>
            ))}
          </div>
          <LineChart pts={ANALYTICS_LINE} />
        </section>
      </div>

      {/* row 4: system status / recent activity */}
      <div className="adm-row r4">
        <section className="adm-card">
          <div className="adm-card-head"><h2>System Status</h2><button type="button" className="adm-link" onClick={() => go('system-activity')}>View All</button></div>
          <ul className="adm-status">
            {STATUS.map((st) => (
              <li key={st.label}><span className="adm-status-ico">{Ico.gear}</span><span className="adm-status-label">{st.label}</span><span className="adm-status-tag">{st.state}</span></li>
            ))}
          </ul>
        </section>

        <section className="adm-card">
          <div className="adm-card-head"><h2>Recent Activity</h2><button type="button" className="adm-link" onClick={() => go('system-activity')}>View All</button></div>
          <ul className="adm-timeline">
            {ACTIVITY.map((a, i) => (
              <li key={i}><span className="adm-timeline-dot" /><div className="adm-timeline-body"><p>{a.text}</p><span>{a.time}</span></div></li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

const AI_caret = <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>;
