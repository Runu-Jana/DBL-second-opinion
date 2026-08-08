import { useState, useRef } from 'react';
import DashboardLayout from '../components/DashboardLayout.jsx';

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
const Ico = {
  up: <svg viewBox="0 0 24 24" width="26" height="26" {...s}><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3M12 4v11M8 8l4-4 4 4" /></svg>,
  file: <svg viewBox="0 0 24 24" width="20" height="20" {...s}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /></svg>,
  check: <svg viewBox="0 0 24 24" width="18" height="18" {...s}><path d="m5 12 4 4 10-10" /></svg>,
};
const RECOMMENDED = ['Pathology / Biopsy Reports', 'Imaging (CT, MRI, PET, X-Ray)', 'Lab Reports', 'Treatment / Discharge Summaries', 'Prescription & Medication Details'];
const fmtSize = (b) => (b < 1024 * 1024 ? (b / 1024).toFixed(0) + ' KB' : (b / 1024 / 1024).toFixed(1) + ' MB');

export default function PortalUpload() {
  const [files, setFiles] = useState([]);
  const [drag, setDrag] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef(null);

  const add = (list) => setFiles((f) => [...f, ...Array.from(list).map((x) => ({ name: x.name, size: x.size }))]);
  const onDrop = (e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.length) add(e.dataTransfer.files); };
  const remove = (i) => setFiles((f) => f.filter((_, idx) => idx !== i));

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
                <input ref={inputRef} type="file" multiple hidden onChange={(e) => e.target.files && add(e.target.files)} />
                <p style={{ marginTop: '1rem', fontSize: '.78rem' }}>Supported: PDF, JPG, PNG · Max 15 MB each</p>
              </div>

              {files.length > 0 && (
                <>
                  <div className="pu-files">
                    {files.map((f, i) => (
                      <div className="pu-file" key={i}>
                        {Ico.file}
                        <span className="nm">{f.name}</span>
                        <span className="sz">{fmtSize(f.size)}</span>
                        <button type="button" className="rm" onClick={() => remove(i)} aria-label="Remove">&times;</button>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="btn btn-primary" style={{ marginTop: '1.2rem', width: '100%', justifyContent: 'center' }} onClick={() => setDone(true)}>
                    Submit {files.length} Report{files.length > 1 ? 's' : ''}
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
