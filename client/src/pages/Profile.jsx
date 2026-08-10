import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Select } from '../components/AdminFields.jsx';
import { initials } from './portalData.js';

const GENDERS = ['Male', 'Female', 'Other'];
const BLOOD = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const profileKey = (email) => 'dbl_profile_' + (email || 'guest').toLowerCase();

export default function Profile() {
  const { session } = useAuth();
  const email = session?.email || '';
  const name = session?.name || '';

  // A brand-new user starts with everything blank except the name & email they signed up with.
  const [f, setF] = useState({ fullName: name, email, phone: '', dob: '', gender: '', city: '', bloodGroup: '', allergies: '' });
  const [saved, setSaved] = useState(false);

  // Load this user's saved profile (if they've filled it before); otherwise keep just name + email.
  useEffect(() => {
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(profileKey(email))); } catch { /* none yet */ }
    setF((prev) => (stored
      ? { ...prev, ...stored, fullName: stored.fullName || name, email }
      : { ...prev, fullName: name, email }));
  }, [email]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setSaved(false); };
  const setV = (k) => (v) => { setF({ ...f, [k]: v }); setSaved(false); };

  const save = (e) => {
    e.preventDefault();
    try { localStorage.setItem(profileKey(email), JSON.stringify(f)); } catch { /* storage full */ }
    setSaved(true);
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
          <span className="av">{initials(f.fullName || name || 'U')}</span>
          <div>
            <h3>{f.fullName || name || 'Your Name'}</h3>
            <p>{email || 'your@email.com'}</p>
          </div>
        </div>

        <div className="pf-section-title">Personal Details</div>
        <div className="pf-grid">
          <label className="pf-field"><span>Full Name</span><input value={f.fullName} onChange={set('fullName')} placeholder="Your full name" /></label>
          <label className="pf-field"><span>Email Address</span><input type="email" value={f.email} onChange={set('email')} placeholder="you@example.com" /></label>
          <label className="pf-field"><span>Phone</span><input value={f.phone} onChange={set('phone')} placeholder="Add your phone number" /></label>
          <label className="pf-field"><span>Date of Birth</span><input type="date" value={f.dob} onChange={set('dob')} /></label>
          <label className="pf-field"><span>Gender</span><Select value={f.gender} onChange={setV('gender')} options={GENDERS} placeholder="Select gender" /></label>
          <label className="pf-field"><span>City</span><input value={f.city} onChange={set('city')} placeholder="Add your city" /></label>
        </div>

        <div className="pf-section-title">Medical Information</div>
        <div className="pf-grid">
          <label className="pf-field"><span>Blood Group</span><Select value={f.bloodGroup} onChange={setV('bloodGroup')} options={BLOOD} placeholder="Select blood group" /></label>
          <label className="pf-field"><span>Known Allergies</span><input value={f.allergies} onChange={set('allergies')} placeholder="e.g. Penicillin — or leave blank" /></label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.4rem' }}>
          <button type="submit" className="btn btn-primary" style={{ padding: '.7rem 1.4rem' }}>Save Changes</button>
          {saved && <span style={{ color: '#1a8f4c', fontSize: '.85rem', fontWeight: 700 }}>✓ Changes saved</span>}
        </div>
      </form>
    </DashboardLayout>
  );
}
