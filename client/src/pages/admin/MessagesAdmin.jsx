import { useEffect, useRef, useState } from 'react';
import { api } from '../../api.js';
import { RefreshButton } from '../../components/AdminFields.jsx';

const timeOf = (iso) => {
  try { return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};
const initials = (n = '') => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();
const same = (a, b) => a && b && a.patientUhid === b.patientUhid && a.patientName === b.patientName;

export default function MessagesAdmin({ flash, on401 }) {
  const [convos, setConvos] = useState([]);
  const [sel, setSel] = useState(null);
  const [thread, setThread] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const bodyRef = useRef(null);

  const loadConvos = () => {
    setLoadingList(true);
    api('/messages', { on401 }).then((d) => { setConvos(Array.isArray(d) ? d : []); setLoadingList(false); })
      .catch((e) => { flash(e.message, 'err'); setLoadingList(false); });
  };
  useEffect(() => { loadConvos(); const id = setInterval(loadConvos, 20000); return () => clearInterval(id); }, []); // eslint-disable-line

  const openThread = (c) => {
    setSel(c);
    const q = new URLSearchParams();
    if (c.patientUhid) q.set('uhid', c.patientUhid);
    if (c.patientName) q.set('name', c.patientName);
    api('/messages/thread?' + q.toString(), { on401 }).then((d) => setThread(Array.isArray(d) ? d : [])).catch((e) => flash(e.message, 'err'));
  };
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [thread]);

  const reply = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || !sel || busy) return;
    setBusy(true);
    const optimistic = { id: 'tmp' + Date.now(), sender: 'care', body, createdAt: new Date().toISOString() };
    setThread((t) => [...t, optimistic]); setText('');
    try {
      const saved = await api('/messages/reply', { method: 'POST', on401, body: JSON.stringify({ patientUhid: sel.patientUhid, patientName: sel.patientName, body }) });
      setThread((t) => t.map((x) => (x.id === optimistic.id ? saved : x)));
      loadConvos();
    } catch (ex) { flash(ex.message, 'err'); setThread((t) => t.filter((x) => x.id !== optimistic.id)); setText(body); }
    finally { setBusy(false); }
  };

  return (
    <div className="adm-module">
      <div className="adm-page-head">
        <div><h1>Patient Messages</h1><p>Reply to patients who message from the portal — {convos.length} conversation{convos.length !== 1 ? 's' : ''}.</p></div>
        <RefreshButton onClick={loadConvos} />
      </div>

      <div className={'mchat' + (sel ? ' has-sel' : '')}>
        <div className="mchat-list">
          {loadingList && <p className="mchat-empty">Loading…</p>}
          {!loadingList && convos.length === 0 && <p className="mchat-empty">No patient messages yet.</p>}
          {convos.map((c) => (
            <button key={c.patientUhid || c.patientName} type="button"
              className={'mchat-item' + (same(sel, c) ? ' active' : '')} onClick={() => openThread(c)}>
              <span className="mchat-av">{initials(c.patientName)}</span>
              <span className="mchat-meta">
                <span className="mchat-nm">{c.patientName}{c.patientUhid ? <em> · {c.patientUhid}</em> : ''}</span>
                <span className="mchat-pv">{c.lastSender === 'care' ? 'You: ' : ''}{c.lastBody}</span>
              </span>
              {c.unread > 0 && <span className="mchat-unread">{c.unread}</span>}
            </button>
          ))}
        </div>

        <div className="mchat-thread">
          {!sel ? (
            <div className="mchat-none">Select a conversation to read and reply.</div>
          ) : (
            <>
              <div className="mchat-head">
                <button type="button" className="mchat-back" onClick={() => setSel(null)} aria-label="Back to list">‹</button>
                <span>{sel.patientName}{sel.patientUhid ? <em> · {sel.patientUhid}</em> : ''}</span>
              </div>
              <div className="chat-body" ref={bodyRef}>
                {thread.map((m) => (
                  <div className={'bubble ' + (m.sender === 'care' ? 'me' : 'them')} key={m.id}>{m.body}<span className="tm">{timeOf(m.createdAt)}</span></div>
                ))}
              </div>
              <form className="chat-compose" onSubmit={reply}>
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your reply…" />
                <button type="submit" className="btn btn-primary" disabled={busy} style={{ padding: '.6rem 1.1rem' }}>{busy ? '…' : 'Reply'}</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
