import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Select, DateField } from '../components/AdminFields.jsx';
import { patientApi } from '../api.js';
import { initials } from './portalData.js';

const GENDERS = ['Male', 'Female', 'Other'];
const BLOOD = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
// dob / bloodGroup / allergies aren't columns on the Patient model, so they stay client-side.
const extraKey = (email) => 'dbl_profile_extra_' + (email || 'guest').toLowerCase();

const Req = () => <em className="pf-req" title="Required" aria-label="required">*</em>;
const Opt = () => <span className="pf-opt">(optional)</span>;

export default function Profile() {
  const navigate = useNavigate();
  const { session, setSession } = useAuth();
  const email = session?.email || '';

  const [f, setF] = useState({ fullName: '', email: '', phone: '', dob: '', gender: '', age: '', city: '', bloodGroup: '', allergies: '' });
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Seed from the live session record, then layer the client-only extras on top.
  useEffect(() => {
    let extra = {};
    try { extra = JSON.parse(localStorage.getItem(extraKey(email))) || {}; } catch { /* none */ }
    setF({
      fullName: session?.name || '',
      email: session?.email || '',
      phone: session?.phone || '',
      gender: session?.gender || '',
      age: session?.age != null ? String(session.age) : '',
      city: session?.city || '',
      dob: extra.dob || '',
      bloodGroup: extra.bloodGroup || '',
      allergies: extra.allergies || '',
    });
  }, [session, email]);

  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setSaved(false); };
  const setV = (k) => (v) => { setF({ ...f, [k]: v }); setSaved(false); };

  const save = async (e) => {
    e.preventDefault();
    if (!f.fullName.trim()) { setErr('Please enter your full name.'); return; }
    setErr(''); setBusy(true);
    try {
      // Core fields → real Patient row (shared with admin + doctor panels).
      const r = await patientApi('/portal/me', {
        method: 'PUT',
        body: JSON.stringify({ name: f.fullName, phone: f.phone, city: f.city, gender: f.gender, age: f.age }),
      });
      setSession(r.patient);
      // Extras → localStorage.
      try { localStorage.setItem(extraKey(email), JSON.stringify({ dob: f.dob, bloodGroup: f.bloodGroup, allergies: f.allergies })); } catch { /* full */ }
      setSaved(true);
      // Show the "saved" confirmation briefly, then take the patient back to their dashboard.
      setTimeout(() => navigate('/dashboard'), 900);
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };

  return (
    <DashboardLayout active="profile">
      <div className="pg-head">
        <div>
          <h1>My Profile</h1>
          <p>Manage your personal and medical details.</p>
        </div>
      </div>

      <form className="dash-card" onSubmit={save}>
        <div className="pf-avatar">
          <span className="av">{initials(f.fullName || 'U')}</span>
          <div>
            <h3>{f.fullName || 'Your Name'}</h3>
            <p>{email || 'your@email.com'}</p>
          </div>
        </div>

        <div className="pf-section-title">Personal Details</div>
        <div className="pf-grid">
          <label className="pf-field"><span>Full Name <Req /></span><input value={f.fullName} onChange={set('fullName')} placeholder="Your full name" required /></label>
          <label className="pf-field"><span>Email Address</span><input type="email" value={f.email} readOnly title="Email can't be changed" placeholder="you@example.com" /></label>
          <label className="pf-field"><span>Phone <Opt /></span><input value={f.phone} onChange={set('phone')} placeholder="Add your phone number" /></label>
          <label className="pf-field"><span>Date of Birth <Opt /></span><DateField value={f.dob} onChange={setV('dob')} placeholder="Select date of birth" /></label>
          <label className="pf-field"><span>Age <Opt /></span><input type="number" min="0" value={f.age} onChange={set('age')} placeholder="Age" /></label>
          <label className="pf-field"><span>Gender <Opt /></span><Select value={f.gender} onChange={setV('gender')} options={GENDERS} placeholder="Select gender" /></label>
          <label className="pf-field"><span>City <Opt /></span><input value={f.city} onChange={set('city')} placeholder="Add your city" /></label>
        </div>

        <div className="pf-section-title">Medical Information</div>
        <div className="pf-grid">
          <label className="pf-field"><span>Blood Group <Opt /></span><Select value={f.bloodGroup} onChange={setV('bloodGroup')} options={BLOOD} placeholder="Select blood group" /></label>
          <label className="pf-field"><span>Known Allergies <Opt /></span><input value={f.allergies} onChange={set('allergies')} placeholder="e.g. Penicillin — or leave blank" /></label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.4rem' }}>
          <button type="submit" className="btn btn-primary" style={{ padding: '.7rem 1.4rem' }} disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</button>
          {saved && <span style={{ color: '#1a8f4c', fontSize: '.85rem', fontWeight: 700 }}>✓ Changes saved</span>}
          {err && <span style={{ color: '#c0392b', fontSize: '.85rem', fontWeight: 700 }}>{err}</span>}
        </div>
      </form>
    </DashboardLayout>
  );
}
