import { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { initials } from './portalData.js';

const THREADS = [
  {
    id: 't1', name: 'Care Coordinator', preview: 'Your report has been reviewed…',
    msgs: [
      { me: false, text: 'Hello Rajesh, welcome to DBL International. How can we help you today?', t: '09:15 AM' },
      { me: true, text: 'Hi, I just uploaded my biopsy report for a second opinion.', t: '09:18 AM' },
      { me: false, text: 'Thank you. Your report has been reviewed by our experts. The detailed opinion will be ready within 24–48 hours.', t: '10:02 AM' },
    ],
  },
  {
    id: 't2', name: 'Dr. Priya Sharma', preview: 'Let’s discuss on the call…',
    msgs: [
      { me: false, text: 'I’ve reviewed your case. Let’s discuss the findings on our scheduled call.', t: 'Yesterday' },
    ],
  },
];

export default function Messages() {
  const [active, setActive] = useState('t1');
  const [text, setText] = useState('');
  const thread = THREADS.find((t) => t.id === active);

  return (
    <DashboardLayout active="messages">
      <div className="pg-head">
        <div>
          <h1>Messages</h1>
          <p>Chat with your care team and specialists.</p>
        </div>
      </div>

      <div className="chat">
        <div className="chat-list">
          {THREADS.map((t) => (
            <button key={t.id} type="button" className={'chat-item' + (t.id === active ? ' active' : '')} onClick={() => setActive(t.id)}>
              <span className="av">{initials(t.name.replace('Dr. ', ''))}</span>
              <span style={{ minWidth: 0 }}>
                <span className="nm" style={{ display: 'block' }}>{t.name}</span>
                <span className="pv" style={{ display: 'block' }}>{t.preview}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="chat-thread">
          <div className="chat-head">{thread.name}</div>
          <div className="chat-body">
            {thread.msgs.map((m, i) => (
              <div className={'bubble ' + (m.me ? 'me' : 'them')} key={i}>
                {m.text}<span className="tm">{m.t}</span>
              </div>
            ))}
          </div>
          <form className="chat-compose" onSubmit={(e) => { e.preventDefault(); setText(''); }}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" />
            <button type="submit" className="btn btn-primary" style={{ padding: '.6rem 1.1rem' }}>Send</button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
