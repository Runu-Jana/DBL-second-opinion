import DashboardLayout from '../components/DashboardLayout.jsx';

const INVOICES = [
  { id: 'INV-2025-014', service: 'Cancer Medical Second Opinion', date: '10 May, 2025', amount: '₹2,999', status: 'Paid', tone: 'paid' },
  { id: 'INV-2025-021', service: 'Clinical Pharmacy Review', date: '09 May, 2025', amount: '₹1,499', status: 'Paid', tone: 'paid' },
  { id: 'INV-2025-030', service: 'Video Consultation', date: '15 May, 2025', amount: '₹999', status: 'Due', tone: 'due' },
];

export default function Payments() {
  return (
    <DashboardLayout active="payments">
      <div className="pg-head">
        <div>
          <h1>Payments</h1>
          <p>Your invoices and payment history.</p>
        </div>
      </div>

      <div className="pay-summary">
        <div className="pay-tile"><div className="lbl">Total Paid</div><div className="amt">₹4,498</div></div>
        <div className="pay-tile due"><div className="lbl">Pending</div><div className="amt">₹999</div></div>
        <div className="pay-tile"><div className="lbl">Invoices</div><div className="amt">3</div></div>
      </div>

      <section className="dash-card">
        <div className="dash-card-head"><h2>Invoices</h2></div>
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead><tr><th>Invoice</th><th>Service</th><th>Date</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {INVOICES.map((v) => (
                <tr key={v.id}>
                  <td className="mono">{v.id}</td>
                  <td>{v.service}</td>
                  <td>{v.date}</td>
                  <td style={{ fontWeight: 700, color: 'var(--ink)' }}>{v.amount}</td>
                  <td><span className={'pill pill-' + v.tone}>{v.status}</span></td>
                  <td>
                    {v.status === 'Due'
                      ? <button type="button" className="btn btn-primary" style={{ padding: '.4rem .9rem', fontSize: '.78rem' }} title="Coming soon">Pay Now</button>
                      : <button type="button" className="dash-link" title="Coming soon">Receipt</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardLayout>
  );
}
