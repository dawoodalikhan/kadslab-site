import { useState, type FormEvent } from 'react';

type Topic = 'role' | 'project' | 'consult' | 'other';
const TOPICS: { id: Topic; label: string; prompt: string }[] = [
  { id: 'role', label: 'A full-time role', prompt: 'Tell me about the role' },
  { id: 'project', label: 'A website or systems project', prompt: 'What does the business need?' },
  { id: 'consult', label: 'Consulting', prompt: 'What are you trying to solve?' },
  { id: 'other', label: 'Something else', prompt: 'Your message' },
];

// Until the Worker endpoint ships, the form opens the visitor's email
// app with everything pre-filled, so no message is ever lost.
export default function ContactForm({ email }: { email: string }) {
  const [topic, setTopic] = useState<Topic>('role');
  const [error, setError] = useState('');
  const cur = TOPICS.find((t) => t.id === topic)!;

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get('name') || '').trim();
    const from = String(f.get('email') || '').trim();
    const message = String(f.get('message') || '').trim();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from) || !message) {
      setError('Please add your name, a valid email and a message.');
      return;
    }
    setError('');
    const extra = topic === 'role' ? `\nCompany: ${f.get('company') || '-'}\nRole: ${f.get('roleTitle') || '-'}` : '';
    const body = `${message}\n\n— ${name} (${from})${extra}`;
    location.href = `mailto:${email}?subject=${encodeURIComponent(`[KADS Lab] ${cur.label} — ${name}`)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <fieldset style={{ margin: 0, padding: 0, border: 0 }}>
        <legend className="field" style={{ marginBottom: 10 }}>I'm reaching out about</legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {TOPICS.map((t) => {
            const on = t.id === topic;
            return <button key={t.id} type="button" aria-pressed={on} onClick={() => setTopic(t.id)} style={{ cursor: 'pointer', padding: '12px 18px', fontSize: 15, border: `1px solid ${on ? 'var(--orange)' : '#5A5B62'}`, background: on ? 'var(--orange)' : 'transparent', color: on ? 'var(--ink)' : 'var(--paper)' }}>{t.label}</button>;
          })}
        </div>
      </fieldset>
      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
        <label className="field">Name<input name="name" autoComplete="name" required /></label>
        <label className="field">Email<input name="email" type="email" autoComplete="email" required /></label>
        {topic === 'role' && <>
          <label className="field">Company<input name="company" autoComplete="organization" /></label>
          <label className="field">Role title<input name="roleTitle" /></label>
        </>}
      </div>
      <label className="field">{cur.prompt}<textarea name="message" rows={6} required /></label>
      {error && <p role="alert" style={{ margin: 0, color: '#FF8A5C' }}>{error}</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
        <button type="submit" className="btn btn-orange">Send message →</button>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#A8A9B0' }}>Opens your email app · no tracking cookies</span>
      </div>
    </form>
  );
}
