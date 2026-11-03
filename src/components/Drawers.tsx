import { useState } from 'react';
import { DRAWERS } from '../data/site';

export default function Drawers() {
  const [open, setOpen] = useState(0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {DRAWERS.map((d, i) => {
        const isOpen = open === i;
        return (
          <div key={d.name} style={{ background: '#fff', borderRadius: 18, border: '1px solid var(--line)', overflow: 'hidden' }}>
            <h3 style={{ margin: 0 }}>
              <button type="button" aria-expanded={isOpen} aria-controls={`drawer-${i}`} onClick={() => setOpen(isOpen ? -1 : i)}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '22px 24px', background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-.02em' }}>{d.name}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted)' }}>{isOpen ? '— close' : '+ open'}</span>
              </button>
            </h3>
            <div id={`drawer-${i}`} hidden={!isOpen} style={{ padding: '0 24px 24px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
                <p style={{ margin: 0, flex: '999 1 320px', color: 'var(--ink-2)' }}>{d.what}</p>
                <span style={{ flex: '1 1 200px', display: 'flex', flexWrap: 'wrap', gap: 6, alignContent: 'start' }}>{d.tools.map((t) => <span key={t} className="chip">{t}</span>)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
