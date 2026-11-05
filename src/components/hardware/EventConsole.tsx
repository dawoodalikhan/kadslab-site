// Serial-monitor style event log. role="log" makes screen readers announce
// new lines politely; merged slider lines update in place and stay quiet.
import { useEffect, useRef } from 'react';
import type { LogEntry } from './useDevice';
import { fmtUptime } from './Telemetry';

const TAG: Record<LogEntry['kind'], string> = { sys: 'SYS', gpio: 'GPIO', sensor: 'SENS', rule: 'RULE', warn: 'WARN' };

export default function EventConsole({ log, onClear }: { log: LogEntry[]; onClear: () => void }) {
  const box = useRef<HTMLOListElement>(null);
  const pinned = useRef(true);
  // Follow new lines only if the reader is already at the bottom, so
  // scrolling back through history isn't yanked away.
  useEffect(() => {
    const el = box.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [log]);

  return (
    <section className="hw-console" aria-labelledby="hw-console-title">
      <div className="hw-panel-head">
        <h4 id="hw-console-title">Event console <span className="hw-mono">· serial 9600 baud (simulated)</span></h4>
        <button type="button" className="hw-btn-text" onClick={onClear} disabled={!log.length}>clear</button>
      </div>
      <ol ref={box} className="hw-log" role="log" aria-label="Device events" tabIndex={0}
        onScroll={(e) => { const el = e.currentTarget; pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24; }}>
        {log.length === 0 && <li className="hw-log-empty">Console cleared. Interact with the board to see new events.</li>}
        {log.map((e) => (
          <li key={e.id} className={`hw-log-line kind-${e.kind}`}>
            <time className="hw-log-time" dateTime={`PT${(e.at / 1000).toFixed(3)}S`} title="Time since the virtual board booted (mm:ss.ms)">[{fmtUptime(e.at)}]</time>
            <span className="hw-log-tag">{TAG[e.kind]}</span>
            <span className="hw-log-text">{e.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
