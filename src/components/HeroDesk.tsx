import { useState } from 'react';

type Piece = { kind: string; name: string; chips: string[]; left: string; top: string; rot: number; line: string; href: string };

const PIECES: Piece[] = [
  { kind: 'State', name: 'Portfolio filter', chips: ['Owned', 'Managed', 'Town ▾'], left: '5%', top: '6%', rot: -6, line: 'Portfolio filter engine: filters, search and state you can share as a link.', href: '/lab/#filter' },
  { kind: 'Forms', name: 'Booking · 2 of 4', chips: ['Studio A', 'Tue 2:00'], left: '46%', top: '4%', rot: 4, line: 'Studio booking flow: conditional steps, validation and availability.', href: '/lab/#booking' },
  { kind: 'Workflows', name: 'CRM route', chips: ['Inquiry', '→ Sales'], left: '22%', top: '34%', rot: -3, line: 'Lead routing simulator: an inquiry classified, routed and followed up.', href: '/lab/#routing' },
  { kind: 'API', name: 'Site inspector', chips: ['200 OK', 'Schema ✓'], left: '56%', top: '38%', rot: 7, line: 'Site inspector: what search engines see on a page.', href: '/lab/#inspector' },
  { kind: 'Hardware', name: 'Motor fault monitor', chips: ['DC motor', 'Fault?'], left: '4%', top: '58%', rot: 3, line: 'Engineering: fault diagnosis for DC motors, from my college embedded work.', href: '/engineering/' },
];

export default function HeroDesk() {
  const [active, setActive] = useState(2);
  const current = PIECES[active]!;
  return (
    <div className="desk">
      {PIECES.map((p, i) => {
        const on = i === active;
        return (
          <button
            key={p.name}
            type="button"
            className="desk-obj"
            aria-pressed={on}
            onClick={() => setActive(i)}
            style={{ left: p.left, top: p.top, transform: `rotate(${on ? 0 : p.rot}deg) translateY(${on ? -8 : 0}px)` }}
          >
            <span style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              <span>{p.kind}</span><span>{String(i + 1).padStart(2, '0')}</span>
            </span>
            <span style={{ display: 'block', marginTop: 8, fontSize: 18, fontWeight: 600, letterSpacing: '-.02em' }}>{p.name}</span>
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {p.chips.map((c) => <span key={c} className="chip">{c}</span>)}
            </span>
          </button>
        );
      })}
      <div aria-live="polite" style={{ position: 'absolute', left: 16, right: 16, bottom: 16, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: 'var(--ink)', color: 'var(--paper)', borderRadius: 16, padding: '14px 18px', fontSize: 14 }}>
        <span><span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#A8A9B0', marginRight: 8 }}>TRY IT</span>{current.line}</span>
        <a href={current.href} style={{ color: 'var(--paper)', fontWeight: 600 }}>Open →</a>
      </div>
    </div>
  );
}
