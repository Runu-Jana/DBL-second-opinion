import { useState, useRef } from 'react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
const Ico = {
  up: <svg viewBox="0 0 24 24" width="26" height="26" {...s}><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3M12 4v11M8 8l4-4 4 4" /></svg>,
  file: <svg viewBox="0 0 24 24" width="20" height="20" {...s}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /></svg>,
  check: <svg viewBox="0 0 24 24" width="18" height="18" {...s}><path d="m5 12 4 4 10-10" /></svg>,
};
const RECOMMENDED = ['Pathology / Biopsy Reports', 'Imaging (CT, MRI, PET, X-Ray)', 'Lab Reports', 'Treatment / Discharge Summaries', 'Prescription & Medication Details'];
// Kept in step with server/routes/upload.js — the server enforces these for real; these
// checks just spare the patient a long upload that was always going to be rejected.
const DOC_EXT = ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx'];
const VIDEO_EXT = ['mp4', 'mov', 'webm', 'ogg', 'ogv'];
const OK_EXT = [...DOC_EXT, ...VIDEO_EXT];
const DOC_MAX = 15 * 1024 * 1024;
const VIDEO_MAX = 50 * 1024 * 1024;
const VIDEO_COUNT_MAX = 2;
const extOf = (n) => (n.split('.').pop() || '').toLowerCase();
const isVideo = (name) => VIDEO_EXT.includes(extOf(name));
const capFor = (name) => (isVideo(name) ? VIDEO_MAX : DOC_MAX);
const fmtSize = (b) => (b < 1024 * 1024 ? (b / 1024).toFixed(0) + ' KB' : (b / 1024 / 1024).toFixed(1) + ' MB');

export default function PortalUpload() {
  const { session } = useAuth();
  const [files, setFiles] = useState([]); // actual File objects
  const [drag, setDrag] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const add = (list) => {
    const next = [...files];
    const rejected = [];
    Array.from(list).forEach((file) => {
      if (OK_EXT.indexOf(extOf(file.name)) === -1) { rejected.push(file.name + ' (unsupported type)'); return; }
      if (file.size > capFor(file.name)) { rejected.push(`${file.name} (over ${isVideo(file.name) ? 50 : 15} MB)`); return; }
      if (isVideo(file.name) && next.filter((f) => isVideo(f.name)).length >= VIDEO_COUNT_MAX) {
        rejected.push(`${file.name} (at most ${VIDEO_COUNT_MAX} videos)`); return;
      }
      if (!next.some((f) => f.name === file.name && f.size === file.size)) next.push(file);
    });
    setFiles(next);
    setError(rejected.length ? 'Skipped: ' + rejected.join(', ') : '');
  };
  const onDrop = (e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.length) add(e.dataTransfer.files); };
  const remove = (i) => setFiles((f) => f.filter((_, idx) => idx !== i));

  const submit = () => {
    if (!files.length) return;
    setBusy(true);
    setError('');
    const fd = new FormData();
    files.forEach((f) => fd.append('reports', f));
    fd.append('patientName', session?.name || 'Website Visitor');
    if (session?.email) fd.append('email', session.email);
    api('/upload/report', { method: 'POST', body: fd, auth: false })
      .then(() => { setFiles([]); setDone(true); })
      .catch((ex) => setError(ex.message || 'Upload failed. Please try again.'))
      .finally(() => setBusy(false));
  };

  return (
    <DashboardLayout active="upload">
      <div className="pg-head">
        <div>
          <h1>Upload Reports</h1>
          <p>Securely upload your medical reports for expert review.</p>
        </div>
      </div>

      <div className="pg-two">
        <section className="dash-card">
          {done ? (
            <div className="empty" style={{ padding: '2.4rem 1rem' }}>
              <span className="need-help-ico" style={{ background: '#e6f7ec', color: '#1a8f4c' }}>{Ico.check}</span>
              <p style={{ fontWeight: 700, color: 'var(--ink)' }}>Reports submitted successfully.</p>
              <p>Our oncology team will begin the review and update your case shortly.</p>
              <button type="button" className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setDone(false)}>Upload more</button>
            </div>
          ) : (
            <>
              <div
                className={'pu-drop' + (drag ? ' drag' : '')}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
              >
                <span className="pu-drop-ico">{Ico.up}</span>
                <h3>Drag &amp; drop your files here</h3>
                <p>or</p>
                <button type="button" className="btn btn-primary" onClick={() => inputRef.current?.click()}>Choose Files</button>
                <input ref={inputRef} type="file" accept="application/pdf,image/*,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,video/mp4,video/webm,video/ogg,video/quicktime" multiple hidden onChange={(e) => { if (e.target.files) add(e.target.files); e.target.value = ''; }} />
                <p style={{ marginTop: '1rem', fontSize: '.78rem' }}>Supported: PDF, Word, JPG, PNG · Max 15 MB each · Video (MP4, MOV, WebM) up to 50 MB</p>
              </div>

              {error && <p style={{ color: '#c0392b', fontSize: '.82rem', fontWeight: 600, marginTop: '.8rem' }}>{error}</p>}

              {files.length > 0 && (
                <>
                  <div className="pu-files">
                    {files.map((f, i) => (
                      <div className="pu-file" key={f.name + f.size}>
                        {Ico.file}
                        <span className="nm">{f.name}</span>
                        <span className="sz">{fmtSize(f.size)}</span>
                        <button type="button" className="rm" onClick={() => remove(i)} aria-label="Remove">&times;</button>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="btn btn-primary" style={{ marginTop: '1.2rem', width: '100%', justifyContent: 'center' }} disabled={busy} onClick={submit}>
                    {busy ? 'Uploading…' : `Submit ${files.length} Report${files.length > 1 ? 's' : ''}`}
                  </button>
                </>
              )}
            </>
          )}
        </section>

        <aside>
          <section className="dash-card">
            <div className="dash-card-head"><h2>Reports We Recommend</h2></div>
            <div className="list">
              {RECOMMENDED.map((r) => (
                <div className="list-row" key={r} style={{ padding: '.7rem 0' }}>
                  <span className="list-ico" style={{ width: 32, height: 32, borderRadius: 9 }}>{Ico.check}</span>
                  <div className="list-body"><h3 style={{ fontWeight: 600, fontSize: '.85rem' }}>{r}</h3></div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </DashboardLayout>
  );
}
