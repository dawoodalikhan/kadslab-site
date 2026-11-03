import { useEffect, useMemo, useState } from 'react';
import LeadRouting from './LeadRouting';

type DemoId = 'filter' | 'routing' | 'booking' | 'inspector' | 'dashboard';
const DEMOS: { id: DemoId; kind: string; name: string; proves: string }[] = [
  { id: 'filter', kind: 'State', name: 'Portfolio filter engine', proves: 'State management, search and filters, accessible controls.' },
  { id: 'routing', kind: 'Workflows', name: 'Lead routing simulator', proves: 'CRM thinking: validation, classification, routing and follow-up rules.' },
  { id: 'booking', kind: 'Forms', name: 'Studio booking flow', proves: 'Multi-step forms, conditional fields, validation and availability.' },
  { id: 'inspector', kind: 'API', name: 'Site inspector', proves: 'API design with loading, error and empty states, plus SEO know-how.' },
  { id: 'dashboard', kind: 'Data', name: 'Campaign dashboard', proves: 'Turning raw campaign data into metrics people can act on.' },
];

export default function LabDemos() {
  const [demo, setDemo] = useState<DemoId>('filter');
  useEffect(() => {
    const h = location.hash.slice(1) as DemoId;
    if (DEMOS.some((d) => d.id === h)) setDemo(h);
  }, []);
  const pick = (id: DemoId) => { setDemo(id); history.replaceState(null, '', `#${id}`); };
  const cur = DEMOS.find((d) => d.id === demo)!;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
      <div role="tablist" aria-label="Demos" style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DEMOS.map((d, i) => {
          const on = d.id === demo;
          return (
            <button key={d.id} id={`tab-${d.id}`} role="tab" type="button" aria-selected={on} aria-controls="lab-panel" onClick={() => pick(d.id)}
              style={{ cursor: 'pointer', textAlign: 'left', borderRadius: 18, padding: '16px 18px', border: `1px solid ${on ? 'var(--ink)' : 'var(--line)'}`, background: on ? 'var(--ink)' : '#fff', color: on ? 'var(--paper)' : 'var(--ink)' }}>
              <span style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', opacity: .75 }}><span>{String(i + 1).padStart(2, '0')}</span><span>{d.kind}</span></span>
              <span style={{ display: 'block', marginTop: 6, fontSize: 19, fontWeight: 600 }}>{d.name}</span>
            </button>
          );
        })}
      </div>
      <div id="lab-panel" role="tabpanel" aria-labelledby={`tab-${demo}`} style={{ flex: '999 1 600px', minWidth: 0, background: '#fff', border: '1px solid var(--line)', borderRadius: 24, overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, padding: '16px 22px', borderBottom: '1px solid var(--line)', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>
          <span>src/components/lab/{demo}</span><span>Portfolio demo · synthetic data</span>
        </div>
        <div style={{ padding: 24 }}>
          {demo === 'filter' && <FilterDemo />}
          {demo === 'routing' && <LeadRouting showEmail />}
          {demo === 'booking' && <BookingDemo />}
          {demo === 'inspector' && <InspectorDemo />}
          {demo === 'dashboard' && <DashboardDemo />}
        </div>
        <div style={{ padding: '18px 22px', borderTop: '1px solid var(--line)', background: 'var(--paper)', fontSize: 14 }}>
          <strong>What this proves:</strong> <span style={{ color: 'var(--ink-2)' }}>{cur.proves}</span>
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
        <input id="f-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or town" style={{ flex: '1 1 220px', border: '1px solid var(--line-2)', borderRadius: 12, padding: '12px 14px' }} />
        {(['all', 'owned', 'managed'] as const).map((t) => <button key={t} type="button" className="pill" aria-pressed={tenure === t} onClick={() => setTenure(t)}>{t[0]!.toUpperCase() + t.slice(1)}</button>)}
        <label className="sr-only" htmlFor="f-sort">Sort</label>
        <select id="f-sort" value={sort} onChange={(e) => setSort(e.target.value as 'name' | 'units')} style={{ border: '1px solid var(--line-2)', borderRadius: 12, padding: '12px 14px', background: '#fff' }}>
          <option value="name">Sort: name</option><option value="units">Sort: most units</option>
        </select>
      </div>
      <p aria-live="polite" style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>{list.length} of {PROPS.length} properties</p>
      {list.length === 0 ? <p style={{ margin: 0, padding: 24, border: '1px dashed var(--line-2)', borderRadius: 14, textAlign: 'center' }}>No properties match. Try another search.</p> : (
        <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          {list.map((p) => (
            <div key={p.n} style={{ border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ height: 80, background: p.t === 'owned' ? '#DCE2E8' : '#E6E0F0' }} />
              <div style={{ padding: 12 }}><div style={{ fontWeight: 600 }}>{p.n}</div><div style={{ fontSize: 13, color: 'var(--muted)' }}>{p.town} · {p.units} units · {p.t}</div></div>
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
        {steps.map((s, i) => <li key={s} aria-current={i === step ? 'step' : undefined} style={{ borderTop: `3px solid ${i <= step ? 'var(--blue)' : 'var(--line-2)'}`, paddingTop: 8, fontWeight: i <= step ? 600 : 400, color: i <= step ? 'var(--ink)' : 'var(--muted)' }}>{i + 1} · {s}</li>)}
      </ol>
      {step === 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{SPACES.map((s) => <button key={s.id} type="button" className="pill" aria-pressed={space === s.id} onClick={() => { setSpace(s.id); setSlot(null); setAddons([]); }}>{s.name}</button>)}</div>}
      {step === 1 && (
        <div role="group" aria-label="Available times" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
          {SLOTS.map((t, i) => { const off = TAKEN[space]!.includes(i); const on = slot === i;
            return <button key={t} type="button" disabled={off} aria-pressed={on} onClick={() => setSlot(i)} style={{ borderRadius: 12, padding: '14px 0', border: `1px solid ${on ? 'var(--blue)' : 'var(--line-2)'}`, background: off ? '#EFEDE8' : on ? 'var(--blue)' : '#fff', color: off ? '#8A8A90' : on ? '#fff' : 'var(--ink)', textDecoration: off ? 'line-through' : 'none', cursor: off ? 'not-allowed' : 'pointer' }}>{t}</button>; })}
        </div>
      )}
      {step === 2 && (
        <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <legend style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 8 }}>Add-ons for {sp.name} (options change with the space)</legend>
          {addonList.map((a) => <label key={a} style={{ display: 'flex', gap: 10, alignItems: 'center' }}><input type="checkbox" checked={addons.includes(a)} onChange={(e) => setAddons((x) => e.target.checked ? [...x, a] : x.filter((y) => y !== a))} />{a}</label>)}
        </fieldset>
      )}
      {step === 3 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>Name<input value={name} onChange={(e) => setName(e.target.value)} style={{ border: '1px solid var(--line-2)', borderRadius: 12, padding: '12px 14px' }} /></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>Email<input value={email} onChange={(e) => setEmail(e.target.value)} style={{ border: '1px solid var(--line-2)', borderRadius: 12, padding: '12px 14px' }} /></label>
        </div>
      )}
      {step === 4 && (
        <div style={{ border: '1px solid var(--line)', borderRadius: 16, padding: 20, background: 'var(--paper)' }}>
          <div className="eyebrow">Sample confirmation · nothing was booked</div>
          <div style={{ marginTop: 8, fontSize: 22, fontWeight: 700 }}>{sp.name}, {SLOTS[slot ?? 0]}</div>
          <div style={{ marginTop: 6, color: 'var(--ink-2)' }}>{addons.length ? addons.join(', ') : 'No add-ons'} · Reference {ref}</div>
        </div>
      )}
      {error && <p role="alert" style={{ margin: 0, color: '#B4361A', fontWeight: 500 }}>{error}</p>}
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
      <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>Preview: this shows a sample report. The live version, a Cloudflare Worker that fetches the real page, ships in the next release.</p>
      <form onSubmit={(e) => { e.preventDefault(); run(); }} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <label className="sr-only" htmlFor="i-url">Page URL</label>
        <input id="i-url" value={url} onChange={(e) => setUrl(e.target.value)} style={{ flex: '1 1 260px', border: '1px solid var(--line-2)', borderRadius: 12, padding: '12px 14px', fontFamily: 'var(--mono)' }} />
        <button className="btn btn-blue" style={{ padding: '12px 18px', borderRadius: 12 }} disabled={state === 'loading'}>{state === 'loading' ? 'Inspecting…' : 'Inspect'}</button>
      </form>
      <div aria-live="polite">
        {state === 'idle' && <p style={{ margin: 0, padding: 24, border: '1px dashed var(--line-2)', borderRadius: 14, textAlign: 'center', color: 'var(--muted)' }}>Enter a public URL and press Inspect.</p>}
        {state === 'loading' && <p style={{ margin: 0, padding: 24, textAlign: 'center' }}>Fetching and parsing…</p>}
        {state === 'error' && <p role="alert" style={{ margin: 0, color: '#B4361A' }}>That doesn’t look like a valid http(s) URL.</p>}
        {state === 'done' && (
          <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            {checks.map((c) => <div key={c.k} style={{ border: '1px solid var(--line)', borderRadius: 14, padding: 14 }}><dt className="eyebrow" style={{ fontSize: 11 }}>{c.k}</dt><dd style={{ margin: '6px 0 0', fontWeight: 500, color: c.ok === false ? '#B4361A' : c.ok ? '#1F7A4C' : 'var(--ink)' }}>{c.ok === false ? '✕ ' : c.ok ? '✓ ' : ''}{c.v}</dd></div>)}
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
        <div role="img" aria-label={`Leads per week, week 1 to 12: ${weekly.join(', ')}`} style={{ height: 180, display: 'flex', alignItems: 'flex-end', gap: 8, borderBottom: '1px solid var(--ink)' }}>
          {weekly.map((v, i) => <span key={i} title={`Week ${i + 1}: ${v} leads`} style={{ flex: '1 1 0', height: `${(v / max) * 100}%`, background: i === WEEKS - 1 ? 'var(--blue)' : '#C9C5BD', borderRadius: '4px 4px 0 0' }} />)}
        </div>
        <figcaption style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--muted)' }}><span>Week 1</span><span>Leads per week · synthetic data</span><span>Week 12</span></figcaption>
      </figure>
    </div>
  );
}
function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return <div style={{ borderTop: `2px solid ${accent ? 'var(--blue)' : 'var(--ink)'}`, paddingTop: 10 }}><div style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</div><div style={{ fontSize: 32, fontWeight: 700, color: accent ? 'var(--blue)' : 'var(--ink)' }}>{value}</div></div>;
}
