import { useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';

const FAQS = [
  { q: 'How long does a second opinion take?', a: 'Once all your reports are uploaded, our oncology team delivers a comprehensive written opinion within 24–48 hours.' },
  { q: 'Which reports should I upload?', a: 'Pathology/biopsy reports, imaging (CT, MRI, PET, X-Ray), lab reports, treatment or discharge summaries, and current prescriptions give our experts the fullest picture.' },
  { q: 'Is my medical data secure?', a: 'Yes. Your data is encrypted in transit and kept strictly confidential. Only your assigned care team can access your case.' },
  { q: 'Can I speak to the oncologist directly?', a: 'Absolutely. You can book a video consultation from the Appointments page to discuss your opinion in detail.' },
  { q: 'How do payments work?', a: 'Each service is billed individually. You can view invoices and pay any dues from the Payments page.' },
];

export default function HelpCenter() {
  const [open, setOpen] = useState(0);

  return (
    <DashboardLayout active="help">
      <div className="pg-head">
        <div>
          <h1>Help Center</h1>
          <p>Answers to common questions — and a team ready to help.</p>
        </div>
      </div>

      <div className="pg-two">
        <div>
          {FAQS.map((f, i) => (
            <div className={'faq-item' + (open === i ? ' open' : '')} key={i}>
              <button type="button" className="faq-q" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
                {f.q}
                <svg className="ic" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              </button>
              <div className="faq-a"><p>{f.a}</p></div>
            </div>
          ))}
        </div>

        <aside>
          <section className="dash-card need-help">
            <span className="need-help-ico">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 13v-1a8 8 0 0 1 16 0v1M4 13a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h1v-5H4M20 13a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-1v-5h1M20 18v1a3 3 0 0 1-3 3h-3" /></svg>
            </span>
            <h3>Still need help?</h3>
            <p>Our care team is available 24/7 to support you.</p>
            <Link to="/dashboard/messages" className="btn btn-primary">Message Care Team</Link>
          </section>
        </aside>
      </div>
    </DashboardLayout>
  );
}
