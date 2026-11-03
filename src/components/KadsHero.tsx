import { useEffect, useState } from 'react';

const STEPS = [
  { l: 'K', rest: 'nowledge', desc: 'Understand the business first.' },
  { l: 'A', rest: 'rchitecture', desc: 'Design the data and the structure.' },
  { l: 'D', rest: 'evelopment', desc: 'Build it properly.' },
  { l: 'S', rest: 'ystems', desc: 'Ship systems that keep running.' },
];

// KADS letters light up in turn (pale → orange → ink) and loop on their own.
// With reduced motion on, the cycle keeps running but only colors change:
// no sliding or lifting.
export default function KadsHero() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % STEPS.length), 1900);
    return () => clearInterval(t);
  }, []);

  const cur = STEPS[i]!;
  return (
    <div>
      <p className="sr-only">KADS: Knowledge, Architecture, Development, Systems.</p>
      <div className="kads-letters" aria-hidden="true">
        {STEPS.map((s, n) => (
          <span key={s.l} className={`kl${n === i ? ' on' : n < i ? ' done' : ''}`}>{s.l}</span>
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
