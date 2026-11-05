import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import LeadRouting from './LeadRouting';
import { T, bd } from '../lib/demo-tokens';
import { EXPERIMENTS, type ExperimentId } from '../data/lab';

type DemoId = ExperimentId;
const DEMOS = EXPERIMENTS;
// The hardware lab is the largest demo, so it's split into its own chunk and
// downloaded only when its tab is opened (or /lab/#hardware is visited).
const HardwareLab = lazy(() => import('./hardware/HardwareLab'));

const isDemo = (h: string): h is DemoId => DEMOS.some((d) => d.id === h);

export default function LabDemos() {
  const [demo, setDemo] = useState<DemoId>('filter');
  // Deep links (/lab/#routing) come from the home page, Digital Dawood and the
  // Project Universe. Read the hash on load and whenever it changes.
  useEffect(() => {
    const sync = () => { const h = location.hash.slice(1); if (isDemo(h)) setDemo(h); };
    sync();
    addEventListener('hashchange', sync);
    return () => removeEventListener('hashchange', sync);
  }, []);
  const pick = (id: DemoId) => { setDemo(id); history.replaceState(null, '', `#${id}`); };
  const cur = DEMOS.find((d) => d.id === demo)!;
  // Arrow keys move between tabs, as the WAI-ARIA tabs pattern expects.
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: DEMOS.length - 1 }[e.key];
    if (n === undefined) return;
    e.preventDefault();
    const next = DEMOS[(n + DEMOS.length) % DEMOS.length]!;
    pick(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  };

  return (
    <div className="lab-demos" style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
      {/* Real anchor targets, rendered into the static HTML, so the browser scrolls here for #filter, #routing, … */}
      {DEMOS.map((d) => <span key={d.id} id={d.id} className="lab-anchor" aria-hidden="true" />)}
      <div role="tablist" aria-label="Demos" aria-orientation="vertical" style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DEMOS.map((d, i) => {
          const on = d.id === demo;
          return (
            <button key={d.id} id={`tab-${d.id}`} role="tab" type="button" aria-selected={on} aria-controls="lab-panel" tabIndex={on ? 0 : -1} onClick={() => pick(d.id)} onKeyDown={(e) => onKey(e, i)} className="lab-tab"
              aria-labelledby={`tab-${d.id}-name`} aria-describedby={`tab-${d.id}-sum`}
              style={{ cursor: 'pointer', textAlign: 'left', borderRadius: 18, padding: '16px 18px', ...bd(on ? T.selBg : T.line, 1), background: on ? T.selBg : T.card, color: on ? T.selFg : T.fg }}>
              <span style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', opacity: .75 }}><span>{String(i + 1).padStart(2, '0')}</span><span>{d.kind}</span></span>
              <span id={`tab-${d.id}-name`} style={{ display: 'block', marginTop: 6, fontSize: 19, fontWeight: 600 }}>{d.name}</span>
              <span id={`tab-${d.id}-sum`} className="lab-tab-sum">{d.summary}</span>
            </button>
          );
        })}
      </div>
      <div id="lab-panel" className="lab-panel" role="tabpanel" aria-labelledby={`tab-${demo}`} style={{ flex: '999 1 600px', minWidth: 0, background: T.card, ...bd(T.line, 1), borderRadius: 24, overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, padding: '16px 22px', ...bd(T.line, 1, 'solid', 'Bottom'), fontFamily: 'var(--mono)', fontSize: 12, color: T.muted }}>
          <span>{demo === 'hardware' ? 'src/components/hardware' : `src/components/lab/${demo}`}</span><span>{demo === 'hardware' ? 'Browser simulation · no real hardware' : 'Portfolio demo · synthetic data'}</span>
        </div>
        <div className="lab-panel-body" style={{ padding: 24 }}>
          <h3 className="sr-only">{cur.name}</h3>
          {demo === 'filter' && <FilterDemo />}
          {demo === 'routing' && <LeadRouting showEmail />}
          {demo === 'booking' && <BookingDemo />}
          {demo === 'inspector' && <InspectorDemo />}
          {demo === 'dashboard' && <DashboardDemo />}
          {demo === 'hardware' && (
            // A real network fetch (the chunk), so a placeholder that holds the space is honest here.
            <Suspense fallback={<p className="lab-loading" role="status">Loading the virtual hardware lab…</p>}>
              <HardwareLab />
            </Suspense>
          )}
        </div>
        <div style={{ padding: '18px 22px', ...bd(T.line, 1, 'solid', 'Top'), background: T.subtle, fontSize: 14 }}>
          <strong>What this proves:</strong> <span style={{ color: T.fg2 }}>{cur.proves}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- 01 Filter ---------- */
const PROPS = [
  { n: 'Alder Court', town: 'Westmont', units: 48, t: 'owned' }, { n: 'The Linden', town: 'Elmhurst', units: 64, t: 'managed' },
  { n: 'Prairie House', town: 'Lisle', units: 36, t: 'owned' }, { n: 'Grove & 5th', town: 'Naperville', units: 72, t: 'managed' },
  { n: 'Harbor Row', town: 'Wheaton', units: 40, t: 'owned' }, { n: 'Maple Yard', town: 'Downers Grove', units: 56, t: 'managed' },
  { n: 'Station 9', town: 'Hinsdale', units: 44, t: 'owned' }, { n: 'Fenwick', town: 'Glen Ellyn', units: 52, t: 'managed' },
  { n: 'Birch Commons', town: 'Lombard', units: 30, t: 'owned' },
] as const;

function FilterDemo() {
  const [q, setQ] = useState('');
  const [tenure, setTenure] = useState<'all' | 'owned' | 'managed'>('all');
  const [sort, setSort] = useState<'name' | 'units'>('name');
  const list = useMemo(() => PROPS
    .filter((p) => tenure === 'all' || p.t === tenure)
    .filter((p) => (p.n + ' ' + p.town).toLowerCase().includes(q.toLowerCase().trim()))
    .slice().sort((a, b) => sort === 'name' ? a.n.localeCompare(b.n) : b.units - a.units), [q, tenure, sort]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <label className="sr-only" htmlFor="f-q">Search properties</label>
        <input id="f-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or town" style={{ flex: '1 1 220px', ...bd(T.line2, 1), borderRadius: 12, padding: '12px 14px' }} />
        {(['all', 'owned', 'managed'] as const).map((t) => <button key={t} type="button" className="pill" aria-pressed={tenure === t} onClick={() => setTenure(t)}>{t[0]!.toUpperCase() + t.slice(1)}</button>)}
        <label className="sr-only" htmlFor="f-sort">Sort</label>
        <select id="f-sort" value={sort} onChange={(e) => setSort(e.target.value as 'name' | 'units')} style={{ ...bd(T.line2, 1), borderRadius: 12, padding: '12px 14px', background: T.card }}>
          <option value="name">Sort: name</option><option value="units">Sort: most units</option>
        </select>
      </div>
      <p aria-live="polite" style={{ margin: 0, fontSize: 14, color: T.muted }}>{list.length} of {PROPS.length} properties</p>
      {list.length === 0 ? <p style={{ margin: 0, padding: 24, ...bd(T.line2, 1, 'dashed'), borderRadius: 14, textAlign: 'center' }}>No properties match. Try another search.</p> : (
        <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          {list.map((p) => (
            <div key={p.n} style={{ ...bd(T.line, 1), borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ height: 80, background: p.t === 'owned' ? T.owned : T.managed }} />
              <div style={{ padding: 12 }}><div style={{ fontWeight: 600 }}>{p.n}</div><div style={{ fontSize: 13, color: T.muted }}>{p.town} · {p.units} units · {p.t}</div></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- 03 Booking ---------- */
const SPACES = [{ id: 'a', name: 'Studio A · Podcast', video: false }, { id: 'b', name: 'Studio B · Video', video: true }];
const SLOTS = ['9:00', '10:00', '11:00', '12:00', '1:00', '2:00', '3:00', '4:00'];
const TAKEN: Record<string, number[]> = { a: [1, 4, 5], b: [0, 2, 6] };

function BookingDemo() {
  const [step, setStep] = useState(0);
  const [space, setSpace] = useState('a');
  const [slot, setSlot] = useState<number | null>(null);
  const [addons, setAddons] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const sp = SPACES.find((s) => s.id === space)!;
  const addonList = sp.video ? ['Camera operator', 'Teleprompter', 'Edited cut'] : ['Audio engineer', 'Edited episode'];
  const steps = ['Space', 'Time', 'Add-ons', 'Details', 'Done'];

  const next = () => {
    setError('');
    if (step === 1 && slot === null) return setError('Pick an available time.');
    if (step === 3) {
      if (!name.trim()) return setError('Enter your name.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter a valid email.');
    }
    setStep((s) => Math.min(s + 1, 4));
  };
  const ref = `KL-${(space + (slot ?? 0) + name.length).toUpperCase()}${String(email.length).padStart(3, '0')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 8, fontSize: 13 }}>
        {steps.map((s, i) => <li key={s} aria-current={i === step ? 'step' : undefined} style={{ ...bd(i <= step ? T.accent : T.line2, 3, 'solid', 'Top'), paddingTop: 8, fontWeight: i <= step ? 600 : 400, color: i <= step ? T.fg : T.muted }}>{i + 1} · {s}</li>)}
      </ol>
      {step === 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{SPACES.map((s) => <button key={s.id} type="button" className="pill" aria-pressed={space === s.id} onClick={() => { setSpace(s.id); setSlot(null); setAddons([]); }}>{s.name}</button>)}</div>}
      {step === 1 && (
        <div role="group" aria-label="Available times" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
          {SLOTS.map((t, i) => { const off = TAKEN[space]!.includes(i); const on = slot === i;
            return <button key={t} type="button" disabled={off} aria-pressed={on} onClick={() => setSlot(i)} style={{ borderRadius: 12, padding: '14px 0', ...bd(on ? T.accent : T.line2, 1), background: off ? T.offBg : on ? T.accent : T.card, color: off ? T.offFg : on ? T.onAccent : T.fg, fontWeight: on ? 700 : 400, textDecoration: off ? 'line-through' : 'none', cursor: off ? 'not-allowed' : 'pointer' }}>{t}</button>; })}
        </div>
      )}
      {step === 2 && (
        <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <legend style={{ fontSize: 14, color: T.muted, marginBottom: 8 }}>Add-ons for {sp.name} (options change with the space)</legend>
          {addonList.map((a) => <label key={a} style={{ display: 'flex', gap: 10, alignItems: 'center' }}><input type="checkbox" checked={addons.includes(a)} onChange={(e) => setAddons((x) => e.target.checked ? [...x, a] : x.filter((y) => y !== a))} />{a}</label>)}
        </fieldset>
      )}
      {step === 3 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>Name<input value={name} onChange={(e) => setName(e.target.value)} style={{ ...bd(T.line2, 1), borderRadius: 12, padding: '12px 14px' }} /></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>Email<input value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...bd(T.line2, 1), borderRadius: 12, padding: '12px 14px' }} /></label>
        </div>
      )}
      {step === 4 && (
        <div style={{ ...bd(T.line, 1), borderRadius: 16, padding: 20, background: T.subtle }}>
          <div className="eyebrow">Sample confirmation · nothing was booked</div>
          <div style={{ marginTop: 8, fontSize: 22, fontWeight: 700 }}>{sp.name}, {SLOTS[slot ?? 0]}</div>
          <div style={{ marginTop: 6, color: T.fg2 }}>{addons.length ? addons.join(', ') : 'No add-ons'} · Reference {ref}</div>
        </div>
      )}
      {error && <p role="alert" style={{ margin: 0, color: T.error, fontWeight: 500 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        {step > 0 && step < 4 && <button type="button" className="pill" onClick={() => { setError(''); setStep((s) => s - 1); }}>Back</button>}
        {step < 4 ? <button type="button" className="btn btn-dark" style={{ padding: '12px 20px' }} onClick={next}>{step === 3 ? 'Confirm booking' : 'Continue'}</button>
          : <button type="button" className="pill" onClick={() => { setStep(0); setSlot(null); setAddons([]); }}>Start over</button>}
      </div>
    </div>
  );
}

/* ---------- 04 Inspector (sample response until the Worker API ships) ---------- */
type Check = { k: string; v: string; ok: boolean | null };
function InspectorDemo() {
  const [url, setUrl] = useState('https://example.com');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [checks, setChecks] = useState<Check[]>([]);
  const run = () => {
    let u: URL;
    try { u = new URL(url); if (!/^https?:$/.test(u.protocol)) throw new Error(); } catch { setState('error'); return; }
    setState('loading');
    setTimeout(() => {
      setChecks([
        { k: 'Host', v: u.hostname, ok: null }, { k: 'Status', v: '200 OK · 0.4 s', ok: true },
        { k: 'Title', v: '14 characters — too short', ok: false }, { k: 'Meta description', v: 'Missing', ok: false },
        { k: 'H1 count', v: '1', ok: true }, { k: 'Content without JavaScript', v: 'Visible', ok: true },
      ]);
      setState('done');
    }, 900);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ margin: 0, fontSize: 14, color: T.muted }}>Preview: this shows a sample report. The live version, a Cloudflare Worker that fetches the real page, ships in the next release.</p>
      <form onSubmit={(e) => { e.preventDefault(); run(); }} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <label className="sr-only" htmlFor="i-url">Page URL</label>
        <input id="i-url" value={url} onChange={(e) => setUrl(e.target.value)} style={{ flex: '1 1 260px', ...bd(T.line2, 1), borderRadius: 12, padding: '12px 14px', fontFamily: 'var(--mono)' }} />
        <button className="btn btn-accent" style={{ padding: '12px 18px', borderRadius: 12 }} disabled={state === 'loading'}>{state === 'loading' ? 'Inspecting…' : 'Inspect'}</button>
      </form>
      <div aria-live="polite">
        {state === 'idle' && <p style={{ margin: 0, padding: 24, ...bd(T.line2, 1, 'dashed'), borderRadius: 14, textAlign: 'center', color: T.muted }}>Enter a public URL and press Inspect.</p>}
        {state === 'loading' && <p style={{ margin: 0, padding: 24, textAlign: 'center' }}>Fetching and parsing…</p>}
        {state === 'error' && <p role="alert" style={{ margin: 0, color: T.error }}>That doesn’t look like a valid http(s) URL.</p>}
        {state === 'done' && (
          <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            {checks.map((c) => <div key={c.k} style={{ ...bd(T.line, 1), borderRadius: 14, padding: 14 }}><dt className="eyebrow" style={{ fontSize: 11 }}>{c.k}</dt><dd style={{ margin: '6px 0 0', fontWeight: 500, color: c.ok === false ? T.error : c.ok ? T.ok : T.fg }}>{c.ok === false ? '✕ ' : c.ok ? '✓ ' : ''}{c.v}</dd></div>)}
          </dl>
        )}
      </div>
    </div>
  );
}

/* ---------- 05 Dashboard ---------- */
const WEEKS = 12;
const SERIES: Record<string, number[]> = {
  paid: [12, 15, 14, 18, 17, 22, 20, 24, 23, 27, 26, 30],
  organic: [20, 21, 23, 22, 25, 27, 28, 30, 31, 33, 34, 37],
  email: [6, 8, 7, 9, 10, 9, 11, 12, 12, 14, 13, 15],
};
const SESSIONS: Record<string, number> = { paid: 6200, organic: 9800, email: 2420 };

function DashboardDemo() {
  const [channel, setChannel] = useState<'all' | keyof typeof SERIES>('all');
  const keys = channel === 'all' ? Object.keys(SERIES) : [channel];
  const weekly = Array.from({ length: WEEKS }, (_, i) => keys.reduce((s, k) => s + SERIES[k]![i]!, 0));
  const leads = weekly.reduce((a, b) => a + b, 0);
  const sessions = keys.reduce((s, k) => s + SESSIONS[k]!, 0);
  const max = Math.max(...weekly);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div role="group" aria-label="Channel" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {(['all', 'paid', 'organic', 'email'] as const).map((c) => <button key={c} type="button" className="pill" aria-pressed={channel === c} onClick={() => setChannel(c)}>{c === 'all' ? 'All channels' : c[0]!.toUpperCase() + c.slice(1)}</button>)}
      </div>
      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <Kpi label="Sessions" value={sessions.toLocaleString()} />
        <Kpi label="Leads" value={leads.toLocaleString()} />
        <Kpi label="Conversion" value={`${((leads / sessions) * 100).toFixed(1)}%`} accent />
      </div>
      <figure style={{ margin: 0 }}>
        <div role="img" aria-label={`Leads per week, week 1 to 12: ${weekly.join(', ')}`} style={{ height: 180, display: 'flex', alignItems: 'flex-end', gap: 8, ...bd(T.fg, 1, 'solid', 'Bottom') }}>
          {weekly.map((v, i) => <span key={i} title={`Week ${i + 1}: ${v} leads`} style={{ flex: '1 1 0', height: `${(v / max) * 100}%`, background: i === WEEKS - 1 ? T.accent : T.bar, borderRadius: '4px 4px 0 0' }} />)}
        </div>
        <figcaption style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: T.muted }}><span>Week 1</span><span>Leads per week · synthetic data</span><span>Week 12</span></figcaption>
      </figure>
    </div>
  );
}
function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return <div style={{ ...bd(accent ? T.accent : T.fg, 2, 'solid', 'Top'), paddingTop: 10 }}><div style={{ fontSize: 13, color: T.muted }}>{label}</div><div style={{ fontSize: 32, fontWeight: 700, color: accent ? T.accent : T.fg }}>{value}</div></div>;
}
