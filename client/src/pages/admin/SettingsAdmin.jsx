import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Select, RefreshButton } from '../../components/AdminFields.jsx';

const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'America/New_York', 'Asia/Singapore'];

export default function SettingsAdmin({ flash, on401 }) {
  const [f, setF] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const load = () => api('/settings', { on401 }).then(setF).catch((e) => flash(e.message, 'err'));
  useEffect(() => { load(); }, []); // eslint-disable-line

  const save = (e) => {
    e.preventDefault();
    api('/settings', { method: 'PUT', on401, body: JSON.stringify(f) })
      .then((s) => { setF(s); flash('Settings saved.'); })
      .catch((ex) => flash(ex.message, 'err'));
  };

  if (!f) return <div className="adm-module"><div className="adm-page-head"><div><h1>Settings</h1><p>Loading…</p></div></div></div>;

  return (
    <div className="adm-module">
      <div className="adm-page-head"><div><h1>Settings</h1><p>Platform configuration.</p></div><RefreshButton onClick={load} /></div>
      <section className="admin-panel">
        <form className="admin-form" onSubmit={save} style={{ maxWidth: 720 }}>
          <div className="admin-form-grid">
            <label className="full">Clinic name<input value={f.clinicName || ''} onChange={set('clinicName')} /></label>
            <label>Support email<input type="email" value={f.supportEmail || ''} onChange={set('supportEmail')} /></label>
            <label>Support phone<input value={f.supportPhone || ''} onChange={set('supportPhone')} /></label>
            <label>Timezone<Select value={f.timezone} onChange={(v) => setF({ ...f, timezone: v })} options={TIMEZONES} /></label>
            <div className="full checks" style={{ flexWrap: 'wrap', gap: '1.2rem' }}>
              <label><input type="checkbox" checked={!!f.emailNotifications} onChange={set('emailNotifications')} /> Email notifications</label>
              <label><input type="checkbox" checked={!!f.smsNotifications} onChange={set('smsNotifications')} /> SMS notifications</label>
              <label><input type="checkbox" checked={!!f.maintenanceMode} onChange={set('maintenanceMode')} /> Maintenance mode</label>
            </div>
          </div>
          <div className="admin-form-actions"><button type="submit" className="btn btn-primary">Save Settings</button></div>
        </form>
      </section>
    </div>
  );
}
