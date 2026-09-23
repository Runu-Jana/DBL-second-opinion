// Where a patient actually reads their second opinion.
//
// Until now the opinion was delivered, emailed and notified about, but there was nowhere to read
// it — every link pointed at the case list, which shows that a case exists and not what the
// specialist said. This is the page all of those links were meant to reach.
import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import OpinionReport from '../components/OpinionReport.jsx';
import { patientApi } from '../api.js';

const fmt = (iso) => (iso
  ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
  : '');

export default function MyOpinion() {
  const [items, setItems] = useState(null);   // null = loading
  const [err, setErr] = useState('');

  useEffect(() => {
    patientApi('/portal/opinions')
      .then((d) => {
        setItems(Array.isArray(d) ? d : []);
        // Opening this page is reading the opinion — mark it read so the dashboard banner clears.
        if (Array.isArray(d) && d.some((o) => !o.read)) patientApi('/portal/opinions/read', { method: 'POST' }).catch(() => {});
      })
      .catch((e) => { setErr(e.message); setItems([]); });
  }, []);

  return (
    <DashboardLayout active="cases">
      <div className="pg-head">
        <div>
          <h1>My Second Opinion</h1>
          <p>The specialist&rsquo;s written review of the reports you sent us.</p>
        </div>
        {items && items.length > 0 && (
          <button type="button" className="btn btn-outline pg-action no-print" onClick={() => window.print()}>
            Print / Save as PDF
          </button>
        )}
      </div>

      {err && <p className="chat-err">{err}</p>}

      {items === null ? (
        <div className="dash-card empty"><p>Loading…</p></div>
      ) : items.length === 0 ? (
        <div className="dash-card empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /></svg>
          <p>No opinion yet. We will let you know the moment your specialist has completed their review.</p>
        </div>
      ) : (
        items.map((o) => (
          o.reportData ? (
            // The full styled report the specialist and admin approved.
            <div className="opinion-report-wrap" key={o.id}>
              <OpinionReport data={o.reportData} patient={{ name: o.patientName }} caseId={o.uhid} doctor={o.doctor} date={o.deliveredAt} />
            </div>
          ) : (
            <article className="dash-card opinion-doc" key={o.id}>
              <header className="opinion-doc-head">
                <div>
                  <h2>Second Opinion</h2>
                  <p>
                    {o.doctor ? <>Reviewed by <strong>{o.doctor}</strong></> : 'Reviewed by our specialist team'}
                    {o.cancerType ? ` · ${o.cancerType}` : ''}
                  </p>
                </div>
                {o.deliveredAt && <span className="opinion-doc-date">{fmt(o.deliveredAt)}</span>}
              </header>
              {o.patientQuestions && (
                <section className="opinion-doc-asked">
                  <h3>What you asked</h3>
                  <p>{o.patientQuestions}</p>
                </section>
              )}
              {/* Preserved exactly as the doctor wrote it — their headings, their line breaks. */}
              <div className="opinion-doc-body">{o.opinion}</div>
              <footer className="opinion-doc-foot">
                This opinion is based on the documents you provided. Please discuss it with your treating
                team before making any change to your care.
              </footer>
            </article>
          )
        ))
      )}
    </DashboardLayout>
  );
}
