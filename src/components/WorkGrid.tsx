import { useEffect, useState } from 'react';
import { TILES, type Discipline } from '../data/site';
import DeviceScroller from './DeviceScroller';
import ConceptPage from './ConceptPage';

const FILTERS: { id: 'all' | Discipline; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'web', label: 'Web development' },
  { id: 'cms', label: 'CMS architecture' },
  { id: 'crm', label: 'CRM & automation' },
  { id: 'lead', label: 'Lead flow' },
  { id: 'seo', label: 'SEO & analytics' },
  { id: 'content', label: 'Content systems' },
];

export default function WorkGrid() {
  const [filter, setFilter] = useState<'all' | Discipline>('all');

  // Keep the filter in the URL so a filtered view can be shared.
  useEffect(() => {
    const f = new URLSearchParams(location.search).get('filter');
    if (f && FILTERS.some((x) => x.id === f)) setFilter(f as Discipline);
  }, []);
  const pick = (id: 'all' | Discipline) => {
    setFilter(id);
    const url = new URL(location.href);
    if (id === 'all') url.searchParams.delete('filter'); else url.searchParams.set('filter', id);
    history.replaceState(null, '', url);
  };

  const tiles = filter === 'all' ? TILES : TILES.filter((t) => t.cats.includes(filter));

  return (
    <>
      <div role="group" aria-label="Filter by discipline" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {FILTERS.map((f) => {
          const count = f.id === 'all' ? TILES.length : TILES.filter((t) => t.cats.includes(f.id as Discipline)).length;
          return (
            <button key={f.id} type="button" className="pill" aria-pressed={filter === f.id} onClick={() => pick(f.id)}>
              {f.label} <span style={{ opacity: .6, fontFamily: 'var(--mono)', fontSize: 12 }}>{count}</span>
            </button>
          );
        })}
      </div>
      <p className="sr-only" aria-live="polite">{tiles.length} projects shown</p>
      <div className="grid-2" style={{ marginTop: 48, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '56px 40px' }}>
        {tiles.map((t) => (
          <article key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <DeviceScroller label={t.industry} height={340}>
              <ConceptPage mock={t.mock} cols={3} big />
            </DeviceScroller>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="eyebrow">{t.industry}</span>
              <h2 style={{ margin: 0, fontSize: 28, lineHeight: 1.15, letterSpacing: '-.03em' }}>{t.title}</h2>
              <p style={{ margin: 0, fontSize: 16, color: 'var(--ink-2)' }}>{t.line}</p>
              <dl style={{ margin: '6px 0 0', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, borderTop: '1px solid #DDD8CF', paddingTop: 14 }}>
                <div><dt className="eyebrow" style={{ fontSize: 11 }}>My role</dt><dd style={{ margin: '4px 0 0', fontSize: 14 }}>{t.role}</dd></div>
                <div><dt className="eyebrow" style={{ fontSize: 11 }}>Built with</dt><dd style={{ margin: '4px 0 0', fontSize: 14 }}>{t.stack}</dd></div>
              </dl>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
