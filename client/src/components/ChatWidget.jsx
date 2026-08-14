import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useLang } from '../i18n.jsx';

const HIDE_ON = ['/admin', '/doctor', '/dashboard'];

const ChatIco = () => <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.6-.8L3 21l1.8-5.9A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5Z" /><path d="M8.5 12h7M8.5 9h4" /></svg>;
const CloseIco = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>;
const SendIco = () => <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>;

export default function ChatWidget() {
  const { pathname } = useLocation();
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', content: t('chat.greeting') }]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef(null);
  const panelRef = useRef(null);
  const fabRef = useRef(null);

  // keep the opening greeting in sync when the language changes (before any exchange)
  useEffect(() => {
    setMessages((m) => (m.length === 1 && m[0].role === 'assistant' ? [{ role: 'assistant', content: t('chat.greeting') }] : m));
  }, [t]);

  // let other parts of the site open the chat (e.g. the "Live Chat" contact tile)
  useEffect(() => {
    const openIt = () => setOpen(true);
    window.addEventListener('open-dbl-chat', openIt);
    return () => window.removeEventListener('open-dbl-chat', openIt);
  }, []);

  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [messages, open, busy]);

  // On mobile, freeze the page behind the chat panel while it's open.
  useEffect(() => {
    if (!open || !window.matchMedia('(max-width:640px)').matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Minimise the chat when clicking/tapping outside it (or pressing Escape).
  useEffect(() => {
    if (!open) return;
    const onOutside = (e) => {
      if (panelRef.current?.contains(e.target) || fabRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onOutside);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onOutside); document.removeEventListener('keydown', onKey); };
  }, [open]);

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
      setMessages((m) => [...m, { role: 'assistant', content: data.reply || t('chat.errNoReply') }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: t('chat.errConnect') }]);
    } finally { setBusy(false); }
  };

  return (
    <>
      <button ref={fabRef} className={'chatw-fab' + (open ? ' open' : '')} onClick={() => setOpen((o) => !o)} aria-label={open ? t('chat.closeLabel') : t('chat.openLabel')}>
        {open ? <CloseIco /> : <ChatIco />}
      </button>

      {open && (
        <div ref={panelRef} className="chatw-panel" role="dialog" aria-label={t('chat.headTitle')}>
          <div className="chatw-head">
            <span className="chatw-head-av" aria-hidden="true">AI</span>
            <div className="chatw-head-meta"><strong>{t('chat.headTitle')}</strong><span>{t('chat.headSub')}</span></div>
            <button className="chatw-close" onClick={() => setOpen(false)} aria-label={t('chat.closeLabel')}>&times;</button>
          </div>
          <div className="chatw-body" ref={bodyRef}>
            {messages.map((m, i) => (
              <div key={i} className={'chatw-msg ' + (m.role === 'user' ? 'me' : 'them')}>{m.content}</div>
            ))}
            {busy && <div className="chatw-msg them chatw-typing" aria-label={t('chat.typing')}><span /><span /><span /></div>}
          </div>
          <form className="chatw-input" onSubmit={send}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t('chat.placeholder')} aria-label={t('chat.placeholder')} />
            <button type="submit" disabled={busy} aria-label={t('chat.sendLabel')}><SendIco /></button>
          </form>
          <p className="chatw-disclaimer">{t('chat.disclaimer')}</p>
        </div>
      )}
    </>
  );
}
