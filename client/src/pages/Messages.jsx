import { useEffect, useRef, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { patientApi } from '../api.js';

const timeOf = (iso) => {
  try { return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};

export default function Messages() {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const bodyRef = useRef(null);

  const load = () => patientApi('/portal/messages')
    .then((list) => { setMsgs(Array.isArray(list) ? list : []); setLoading(false); })
    .catch(() => setLoading(false));

  useEffect(() => { load(); const id = setInterval(load, 20000); return () => clearInterval(id); }, []);
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [msgs]);

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true); setErr('');
    const optimistic = { id: 'tmp' + Date.now(), sender: 'patient', body, createdAt: new Date().toISOString() };
    setMsgs((m) => [...m, optimistic]); setText('');
    try {
      const saved = await patientApi('/portal/messages', { method: 'POST', body: JSON.stringify({ body }) });
      setMsgs((m) => m.map((x) => (x.id === optimistic.id ? saved : x)));
    } catch (ex) {
      setErr(ex.message || 'Could not send. Please try again.');
      setMsgs((m) => m.filter((x) => x.id !== optimistic.id)); setText(body);
    } finally { setBusy(false); }
  };

  return (
    <DashboardLayout active="messages">
      <div className="pg-head">
        <div><h1>Messages</h1><p>Chat with your care team — we usually reply within a few hours.</p></div>
      </div>

      <div className="chat-single">
        <div className="chat-head"><span className="chat-head-av">DBL</span> Care Team</div>
        <div className="chat-body" ref={bodyRef}>
          {loading && <p className="chat-empty">Loading…</p>}
          {!loading && msgs.length === 0 && (
            <p className="chat-empty">No messages yet. Send us a message and our care team will get back to you.</p>
          )}
          {msgs.map((m) => (
            <div className={'bubble ' + (m.sender === 'patient' ? 'me' : 'them')} key={m.id}>
              {m.body}<span className="tm">{timeOf(m.createdAt)}</span>
            </div>
          ))}
        </div>
        {err && <p className="chat-err">{err}</p>}
        <form className="chat-compose" onSubmit={send}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" aria-label="Type a message" />
          <button type="submit" className="btn btn-primary" disabled={busy} style={{ padding: '.6rem 1.1rem' }}>{busy ? '…' : 'Send'}</button>
        </form>
      </div>
    </DashboardLayout>
  );
}
