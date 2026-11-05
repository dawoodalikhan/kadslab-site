import { useState } from 'react';
import { describeRoute, type LeadType } from '../lib/route-lead';
import { T, bd } from '../lib/demo-tokens';

const TYPES: { id: LeadType; label: string }[] = [
  { id: 'service', label: 'Service request' },
  { id: 'sales', label: 'Quote request' },
  { id: 'general', label: 'General question' },
];

export default function LeadRouting({ showEmail = false }: { showEmail?: boolean }) {
  const [type, setType] = useState<LeadType>('service');
  const [email, setEmail] = useState('alex@example.com');
  const steps = describeRoute({ type, email });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div role="group" aria-label="Inquiry type" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {TYPES.map((t) => (
          <button key={t.id} type="button" className="pill" aria-pressed={type === t.id} onClick={() => setType(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {showEmail && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, color: T.muted }}>
          Sample email (try breaking it)
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...bd(T.line2, 1), borderRadius: 12, padding: '12px 14px', fontSize: 15, background: T.card, color: T.fg }} />
        </label>
      )}
      <ol aria-live="polite" style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {steps.map((s, i) => (
          <li key={s.stage + i} style={{ display: 'flex', gap: 16, alignItems: 'center', background: T.card, ...bd(T.line, 1), borderRadius: 18, padding: '16px 20px' }}>
            <span aria-hidden="true" style={{ flex: '0 0 34px', height: 34, borderRadius: '50%', background: T.accent, color: T.onAccent, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 13 }}>{i + 1}</span>
            <span>
              <span style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>{s.stage}</span>
              <span style={{ display: 'block', marginTop: 3, fontSize: 16, fontWeight: 500 }}>{s.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
