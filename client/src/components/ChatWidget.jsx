import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const GREETING = { role: 'assistant', content: "Hi! 👋 I'm the DBL virtual assistant. Ask me about second opinions, uploading your reports, our services, or how the process works." };
const HIDE_ON = ['/admin', '/doctor', '/dashboard'];

const ChatIco = () => <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.6-.8L3 21l1.8-5.9A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5Z" /><path d="M8.5 12h7M8.5 9h4" /></svg>;
const CloseIco = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>;
const SendIco = () => <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>;

export default function ChatWidget() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef(null);

  // let other parts of the site open the chat (e.g. the "Live Chat" contact tile)
  useEffect(() => {
    const openIt = () => setOpen(true);
    window.addEventListener('open-dbl-chat', openIt);
    return () => window.removeEventListener('open-dbl-chat', openIt);
  }, []);

  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [messages, open, busy]);

  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  const send = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || busy) return;
    const next = [...messages, { role: 'user', content }];
    setMessages(next); setText(''); setBusy(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: 'assistant', content: data.reply || "Sorry, I couldn't respond. Please try our contact form." }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: "Sorry, I'm having trouble connecting. Please use the contact form and our team will help." }]);
    } finally { setBusy(false); }
  };

  return (
    <>
      <button className={'chatw-fab' + (open ? ' open' : '')} onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close chat' : 'Chat with us'}>
        {open ? <CloseIco /> : <ChatIco />}
      </button>

      {open && (
        <div className="chatw-panel" role="dialog" aria-label="DBL virtual assistant">
          <div className="chatw-head">
            <span className="chatw-head-av" aria-hidden="true">AI</span>
            <div className="chatw-head-meta"><strong>DBL Assistant</strong><span>Ask us anything · replies instantly</span></div>
            <button className="chatw-close" onClick={() => setOpen(false)} aria-label="Close">&times;</button>
          </div>
          <div className="chatw-body" ref={bodyRef}>
            {messages.map((m, i) => (
              <div key={i} className={'chatw-msg ' + (m.role === 'user' ? 'me' : 'them')}>{m.content}</div>
            ))}
            {busy && <div className="chatw-msg them chatw-typing" aria-label="Assistant is typing"><span /><span /><span /></div>}
          </div>
          <form className="chatw-input" onSubmit={send}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your question…" aria-label="Type your message" />
            <button type="submit" disabled={busy} aria-label="Send message"><SendIco /></button>
          </form>
          <p className="chatw-disclaimer">AI assistant · not medical advice. A specialist reviews your reports for any diagnosis.</p>
        </div>
      )}
    </>
  );
}
