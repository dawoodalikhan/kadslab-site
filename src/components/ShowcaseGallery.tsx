import { useEffect, useRef, useState } from 'react';
import { SHOWCASE, type ShowcaseEra, type ShowcaseItem } from '../data/showcase';

type Selected = { item: ShowcaseItem; era: ShowcaseEra } | null;

// Live work, grouped by employer. Each screen auto-scrolls a full-page
// screenshot; clicking opens the details. Client names are never shown.
export default function ShowcaseGallery({ limit, dark = false }: { limit?: number; dark?: boolean }) {
  const [sel, setSel] = useState<Selected>(null);
  const eras = limit
    ? [{ ...SHOWCASE[0]!, items: SHOWCASE.flatMap((e) => e.items.filter((i) => !i.own)).slice(0, limit) }]
    : SHOWCASE;
  const allEras = Object.fromEntries(SHOWCASE.flatMap((e) => e.items.map((i) => [i.id, e])));

  return (
    <>
      {eras.map((era) => (
        <section key={era.years + era.items.length} style={{ marginTop: limit ? 0 : 64 }}>
          {!limit && (
            <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, borderTop: `2px solid ${dark ? 'var(--paper)' : 'var(--ink)'}`, paddingTop: 16 }}>
              <h2 style={{ margin: 0, fontSize: 28, letterSpacing: '-.02em' }}>{era.employer} <span style={{ fontWeight: 500, color: dark ? '#A8A9B0' : 'var(--muted)' }}>· {era.position}</span></h2>
              <span className="mono" style={{ fontSize: 13, color: dark ? '#A8A9B0' : 'var(--muted)' }}>{era.years}</span>
            </header>
          )}
          <div className="grid-3" style={{ marginTop: limit ? 0 : 28, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 28 }}>
            {era.items.map((item) => (
              <Tile key={item.id} item={item} dark={dark} onOpen={() => setSel({ item, era: allEras[item.id]! })} />
            ))}
          </div>
        </section>
      ))}
      {sel && <Details sel={sel} onClose={() => setSel(null)} />}
    </>
  );
}

function Tile({ item, onOpen, dark }: { item: ShowcaseItem; onOpen: () => void; dark: boolean }) {
  const [missing, setMissing] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // The image may fail before React hydrates, so check it once on mount too.
  useEffect(() => { const el = img.current; if (el && el.complete && el.naturalWidth === 0) setMissing(true); }, []);
  return (
    <button type="button" onClick={onOpen} className="show-tile" aria-label={`${item.title}: view details`}
      style={{ all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <span className="mac" style={{ display: 'block' }}>
        <span className="mac-frame" style={{ display: 'block' }}>
          <span className="mac-screen" style={{ display: 'block', height: 230, background: '#E6E2DA' }}>
            {missing ? (
              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>Screenshot coming soon</span>
            ) : (
              <img ref={img} className="show-scroll" src={`/showcase/${item.id}.jpg`} alt="" loading="lazy" decoding="async" onError={() => setMissing(true)} style={{ width: '100%', height: 'auto', display: 'block' }} />
            )}
            <span className="show-hint">View details</span>
          </span>
        </span>
        <span className="mac-base" style={{ display: 'block' }} />
      </span>
      <span>
        <span className="eyebrow" style={{ color: dark ? '#A8A9B0' : undefined }}>{item.industry} · {item.platform}</span>
        <span style={{ display: 'block', marginTop: 6, fontFamily: 'var(--display)', fontSize: 19, fontWeight: 700, letterSpacing: '-.01em' }}>{item.title}</span>
      </span>
    </button>
  );
}

function Details({ sel, onClose }: { sel: NonNullable<Selected>; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    const close = () => onClose();
    d.addEventListener('close', close);
    return () => d.removeEventListener('close', close);
  }, [onClose]);
  const { item, era } = sel;
  return (
    <dialog ref={ref} className="show-dialog" aria-labelledby="show-title" onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}>
      <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
          <div>
            <span className="eyebrow">{era.employer} · {era.years}</span>
            <h3 id="show-title" style={{ margin: '8px 0 0', fontSize: 26, letterSpacing: '-.02em', lineHeight: 1.15 }}>{item.title}</h3>
          </div>
          <button type="button" onClick={() => ref.current?.close()} aria-label="Close" style={{ border: '1px solid var(--line-2)', background: '#fff', borderRadius: 999, width: 44, height: 44, cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
          <Row k="Client" v={item.own ? `${era.employer} (agency’s own site)` : 'Name withheld'} lock={!item.own} />
          <Row k="Industry" v={item.industry} />
          <Row k="My role" v={item.role} />
          <Row k="Platform" v={item.platform} />
        </dl>
        <div>
          <span className="eyebrow">What I did</span>
          <p style={{ margin: '6px 0 0', fontSize: 16, lineHeight: 1.6, color: 'var(--ink-2)' }}>{item.did}</p>
        </div>
        {!item.own && (
          <p className="mono" style={{ margin: 0, fontSize: 12, color: 'var(--muted)', borderTop: '1px solid var(--line)', paddingTop: 14 }}>
            Built while working at {era.employer}. Client names and project specifics stay private out of respect for that agreement. Happy to walk through the work in an interview.
          </p>
        )}
      </div>
    </dialog>
  );
}

function Row({ k, v, lock }: { k: string; v: string; lock?: boolean }) {
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 14, padding: '12px 14px' }}>
      <dt className="eyebrow" style={{ fontSize: 11 }}>{k}</dt>
      <dd style={{ margin: '4px 0 0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
        {lock && <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>}
        {v}
      </dd>
    </div>
  );
}
