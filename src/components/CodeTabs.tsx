import { useState } from 'react';

type File = { name: string; note: string; code: string };

// Shows real source files from this repository (imported with ?raw at build time).
export default function CodeTabs({ files }: { files: File[] }) {
  const [i, setI] = useState(0);
  const cur = files[i]!;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div role="tablist" aria-label="Source files" style={{ display: 'flex', flexWrap: 'wrap' }}>
        {files.map((f, n) => (
          <button key={f.name} type="button" role="tab" aria-selected={n === i} onClick={() => setI(n)}
            style={{ cursor: 'pointer', padding: '10px 16px', fontFamily: 'var(--mono)', fontSize: 13, border: '1px solid var(--ink)', marginRight: -1, background: n === i ? 'var(--ink)' : 'var(--paper)', color: n === i ? 'var(--paper)' : 'var(--ink)' }}>
            {f.name}
          </button>
        ))}
      </div>
      <pre tabIndex={0} aria-label={`Source of ${cur.name}`} style={{ margin: 0, maxHeight: 520, overflow: 'auto', background: 'var(--ink)', color: '#E8E4DE', padding: 24, fontFamily: 'var(--mono)', fontSize: 13.5, lineHeight: 1.7 }}><code>{cur.code}</code></pre>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)' }}>{cur.note}</p>
    </div>
  );
}
