import { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { initials } from './portalData.js';

export default function Profile() {
  const { session } = useAuth();
  const name = session?.name || 'Rajesh Kumar';
  const [saved, setSaved] = useState(false);

  const field = (label, props = {}) => (
    <label className="pf-field">
      <span>{label}</span>
      <input {...props} onChange={() => setSaved(false)} />
    </label>
  );

  return (
    <DashboardLayout active="profile">
      <div className="pg-head">
        <div>
          <h1>My Profile</h1>
          <p>Manage your personal and medical details.</p>
        </div>
      </div>

      <form className="dash-card" onSubmit={(e) => { e.preventDefault(); setSaved(true); }}>
        <div className="pf-avatar">
          <span className="av">{initials(name)}</span>
          <div>
            <h3>{name}</h3>
            <p>{session?.email || 'rajesh@example.com'}</p>
          </div>
        </div>

        <div className="pf-section-title">Personal Details</div>
        <div className="pf-grid">
          {field('Full Name', { defaultValue: name })}
          {field('Email Address', { type: 'email', defaultValue: session?.email || 'rajesh@example.com' })}
          {field('Phone', { defaultValue: '+91 98765 43210' })}
          {field('Date of Birth', { type: 'date', defaultValue: '1985-06-12' })}
          <label className="pf-field">
            <span>Gender</span>
            <select defaultValue="Male" onChange={() => setSaved(false)}><option>Male</option><option>Female</option><option>Other</option></select>
          </label>
          {field('City', { defaultValue: 'Mumbai' })}
        </div>

        <div className="pf-section-title">Medical Information</div>
        <div className="pf-grid">
          <label className="pf-field">
            <span>Blood Group</span>
            <select defaultValue="O+" onChange={() => setSaved(false)}><option>O+</option><option>O-</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option></select>
          </label>
          {field('Known Allergies', { defaultValue: 'None' })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.4rem' }}>
          <button type="submit" className="btn btn-primary" style={{ padding: '.7rem 1.4rem' }}>Save Changes</button>
          {saved && <span style={{ color: '#1a8f4c', fontSize: '.85rem', fontWeight: 700 }}>✓ Changes saved</span>}
        </div>
      </form>
    </DashboardLayout>
  );
}
