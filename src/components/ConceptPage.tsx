import type { Tile } from '../data/site';

// A small, original website concept rendered inside a DeviceScroller.
export default function ConceptPage({ mock, cols = 2, big = false }: { mock: Tile['mock']; cols?: number; big?: boolean }) {
  const c = mock.colors;
  return (
    <div style={{ background: c.bg, color: c.fg }}>
      <div style={{ padding: big ? 20 : 16, background: c.head, color: c.headFg }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: big ? 12 : 11 }}>
          <span style={{ fontWeight: 700, letterSpacing: '.08em' }}>{mock.brand}</span><span style={{ opacity: .8 }}>Menu</span>
        </div>
        <div style={{ marginTop: big ? 36 : 28, fontSize: big ? 30 : 22, fontWeight: 700, lineHeight: 1.05, letterSpacing: '-.02em', maxWidth: 420 }}>{mock.hero}</div>
        <div style={{ marginTop: 14, display: 'inline-block', fontSize: big ? 12 : 10, padding: '7px 11px', background: c.cta, color: c.ctaFg }}>{mock.cta}</div>
      </div>
      <div style={{ padding: big ? '14px 20px' : '12px 16px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {mock.chips.map((ch) => <span key={ch} style={{ fontSize: big ? 11 : 10, padding: '5px 9px', borderRadius: 999, border: `1px solid ${c.line}` }}>{ch}</span>)}
      </div>
      <div style={{ padding: big ? '0 20px 20px' : '0 16px 16px', display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: big ? 10 : 8 }}>
        {mock.rows.map((r) => (
          <div key={r.a} style={{ borderRadius: 6, overflow: 'hidden', background: c.card }}>
            <div style={{ height: big ? 60 : 48, background: c.img }} />
            <div style={{ padding: 8, fontSize: big ? 11 : 10, fontWeight: 600 }}>{r.a}<div style={{ fontWeight: 400, opacity: .7, marginTop: 2 }}>{r.b}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}
