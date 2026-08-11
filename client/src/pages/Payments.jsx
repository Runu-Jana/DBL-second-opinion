import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { patientApi, rupees } from '../api.js';

const STONE = { Paid: 'paid', Pending: 'due', Overdue: 'due', Refunded: 'gray' };

export default function Payments() {
  const [invoices, setInvoices] = useState(null);

  useEffect(() => { patientApi('/portal/invoices').then(setInvoices).catch(() => setInvoices([])); }, []);

  const all = invoices || [];
  const paid = all.filter((v) => v.status === 'Paid').reduce((s, v) => s + (v.amount || 0), 0);
  const pending = all.filter((v) => v.status !== 'Paid' && v.status !== 'Refunded').reduce((s, v) => s + (v.amount || 0), 0);

  return (
    <DashboardLayout active="payments">
      <div className="pg-head">
        <div>
          <h1>Payments</h1>
          <p>Your invoices and payment history.</p>
        </div>
      </div>

      <div className="pay-summary">
        <div className="pay-tile"><div className="lbl">Total Paid</div><div className="amt">{rupees(paid)}</div></div>
        <div className="pay-tile due"><div className="lbl">Pending</div><div className="amt">{rupees(pending)}</div></div>
        <div className="pay-tile"><div className="lbl">Invoices</div><div className="amt">{all.length}</div></div>
      </div>

      <section className="dash-card">
        <div className="dash-card-head"><h2>Invoices</h2></div>
        <div className="dash-table-wrap">
          {invoices === null ? (
            <div className="empty" style={{ padding: '2rem 1rem' }}><p>Loading…</p></div>
          ) : all.length ? (
            <table className="dash-table">
              <thead><tr><th>Invoice</th><th>Service</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {all.map((v) => (
                  <tr key={v.id}>
                    <td className="mono">INV-{String(v.id).padStart(4, '0')}</td>
                    <td>{v.service || '—'}</td>
                    <td>{v.date || '—'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--ink)' }}>{rupees(v.amount)}</td>
                    <td><span className={'pill pill-' + (STONE[v.status] || 'due')}>{v.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty" style={{ padding: '2rem 1rem' }}><p>No invoices yet.</p></div>
          )}
        </div>
      </section>
    </DashboardLayout>
  );
}
