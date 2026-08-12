import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';

const OK_EXT = ['pdf', 'png', 'jpg', 'jpeg'];
const MAX = 15 * 1024 * 1024;

function humanSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}
const extOf = (n) => (n.split('.').pop() || '').toLowerCase();

export default function UploadModal() {
  const { uploadOpen, setUploadOpen, session, logout } = useAuth();
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState(null); // {msg, kind}
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!uploadOpen) return;
    setFiles([]); setStatus(null);
    const onKey = (e) => { if (e.key === 'Escape') setUploadOpen(false); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [uploadOpen, setUploadOpen]);

  if (!uploadOpen) return null;

  const addFiles = (list) => {
    const rejected = [];
    const next = [...files];
    Array.from(list).forEach((file) => {
      if (OK_EXT.indexOf(extOf(file.name)) === -1) { rejected.push(file.name + ' (unsupported type)'); return; }
      if (file.size > MAX) { rejected.push(file.name + ' (over 15 MB)'); return; }
      if (!next.some((f) => f.name === file.name && f.size === file.size)) next.push(file);
    });
    setFiles(next);
    setStatus(rejected.length ? { msg: 'Skipped: ' + rejected.join(', '), kind: 'warn' } : null);
  };

  const submit = () => {
    if (!files.length || !session) return;
    setBusy(true);
    setStatus({ msg: 'Securely uploading ' + files.length + ' file(s)…', kind: 'progress' });
    const fd = new FormData();
    files.forEach((f) => fd.append('reports', f));
    fd.append('patientName', session?.name || 'Website Visitor');
    if (session?.email) fd.append('email', session.email);
    api('/upload/report', { method: 'POST', body: fd, auth: false })
      .then((r) => {
        setFiles([]);
        setStatus({ msg: '✓ ' + (r.count || files.length) + ' report(s) received. Our oncology team will review them and respond within 24–48 hours.', kind: 'success' });
      })
      .catch((ex) => setStatus({ msg: ex.message || 'Upload failed. Please try again.', kind: 'warn' }))
      .finally(() => setBusy(false));
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setUploadOpen(false); }}>
      <div className="modal modal-wide" role="dialog" aria-modal="true">
        <button className="modal-close" onClick={() => setUploadOpen(false)} aria-label="Close">&times;</button>
        <div className="modal-head left">
          <h3>Upload Your Medical Reports</h3>
          <p className="modal-sub">
            Welcome, <strong>{session?.name || 'patient'}</strong>. Add your reports below and our oncologists will review them carefully.{' '}
            <button type="button" className="link-btn" onClick={logout}>Log out</button>
          </p>
        </div>

        <label
          className={'dropzone' + (drag ? ' drag' : '')}
          onDragEnter={(e) => { e.preventDefault(); setDrag(true); }}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDrag(false); }}
          onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer?.files) addFiles(e.dataTransfer.files); }}
        >
          <input ref={inputRef} type="file" accept="application/pdf,image/*" multiple hidden
            onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          <span className="dropzone-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V6m0 0-4 4m4-4 4 4" /><path d="M5 15v2.5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5V15" /></svg>
          </span>
          <strong>Drag &amp; drop your reports here</strong>
          <span className="dropzone-hint">or click to browse — PDF, PNG, JPG, JPEG · up to 15&nbsp;MB each</span>
        </label>

        {files.length > 0 && (
          <ul className="file-list">
            {files.map((f, i) => (
              <li className="file-item" key={f.name + f.size}>
                <span className="file-ico">
                  {extOf(f.name) === 'pdf'
                    ? <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /></svg>
                    : <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="4" y="4" width="16" height="16" rx="2" /><circle cx="9" cy="9" r="1.6" /><path d="m5 17 4-4 3 3 3-4 4 5" /></svg>}
                </span>
                <span className="file-meta">
                  <span className="file-name">{f.name}</span>
                  <span className="file-size">{humanSize(f.size)}</span>
                </span>
                <button type="button" className="file-remove" aria-label="Remove file"
                  onClick={() => setFiles(files.filter((_, j) => j !== i))}>&times;</button>
              </li>
            ))}
          </ul>
        )}

        {status && <p className={'upload-status ' + status.kind} style={{ display: 'block' }}>{status.msg}</p>}

        <div className="upload-actions">
          <button type="button" className="btn btn-primary btn-block" disabled={!files.length || busy} onClick={submit}>
            {busy ? 'Uploading…' : 'Submit Reports Securely'}
          </button>
        </div>

        <p className="modal-privacy">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
          Files stay private on this device until you submit. Handled with full confidentiality — we're with you every step.
        </p>
      </div>
    </div>
  );
}
