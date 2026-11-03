import { useEffect, useState } from 'react';

const STEPS = [
  { l: 'K', rest: 'nowledge', desc: 'Understand the business first.' },
  { l: 'A', rest: 'rchitecture', desc: 'Design the data and the structure.' },
  { l: 'D', rest: 'evelopment', desc: 'Build it properly.' },
  { l: 'S', rest: 'ystems', desc: 'Ship systems that keep running.' },
];

// KADS letters light up in turn (pale → orange → ink) while its word
// slides in underneath. Pauses on hover and respects reduced motion.
export default function KadsHero() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    setStill(mq.matches);
    const on = () => setStill(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    if (paused || still) return;
    const t = setTimeout(() => setI((n) => (n + 1) % STEPS.length), 1900);
    return () => clearTimeout(t);
  }, [i, paused, still]);

  const cur = STEPS[i]!;
  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <p className="sr-only">KADS: Knowledge, Architecture, Development, Systems.</p>
      <div className="kads-letters" aria-hidden="true">
        {STEPS.map((s, n) => (
          <button
            key={s.l}
            type="button"
            tabIndex={-1}
            onClick={() => setI(n)}
            className={`kl${n === i ? ' on' : n < i ? ' done' : ''}`}
            style={{ background: 'none', border: 0, padding: 0, font: 'inherit', cursor: 'pointer', lineHeight: 'inherit' }}
          >
            {s.l}
          </button>
        ))}
      </div>
      <div className="kads-bar" aria-hidden="true"><span style={{ width: `${((i + 1) / STEPS.length) * 100}%` }} /></div>
      <p className="kads-word" aria-hidden="true">
        <span key={i} className="kw-in"><b>{cur.l}</b>{cur.rest}</span>
        <span key={`d${i}`} className="kw-desc">{cur.desc}</span>
      </p>
    </div>
  );
}
