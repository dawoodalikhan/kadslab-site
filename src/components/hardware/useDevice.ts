// React glue for a DeviceLink: current snapshot, event log and a short
// telemetry history. Presentation components only read from this.
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { Command, DeviceEvent, EventKind } from '../../lib/hardware/device';
import type { DeviceLink } from '../../lib/hardware/link';
import type { LedId, Snapshot } from '../../lib/hardware/model';

export type LogEntry = { id: number; at: number; kind: EventKind; text: string; key?: string };
export type Sample = { t: number; tempC: number; lux: number; duty: Record<LedId, number>; status: boolean };

const LOG_MAX = 80;
const HISTORY_MAX = 60; // 60 samples × 500 ms = the last 30 seconds
const SAMPLE_MS = 500;
const MERGE_MS = 1500;

const sample = (s: Snapshot): Sample => ({ t: s.uptime, tempC: s.readings.temp.c, lux: s.readings.light.lux, duty: s.duty, status: s.statusLed });

export function useDevice(link: DeviceLink, root: RefObject<HTMLElement | null>) {
  const [snap, setSnap] = useState<Snapshot>(() => link.snapshot());
  const [log, setLog] = useState<LogEntry[]>([]);
  const [history, setHistory] = useState<Sample[]>(() => [sample(link.snapshot())]);
  /** Bumps when the board "transmits", so the TX LED can blink. */
  const [tx, setTx] = useState(0);
  /** Board uptime, refreshed by the sampler (kept apart from `snap` so the workbench doesn't redraw every tick). */
  const [uptime, setUptime] = useState(snap.uptime);
  const nextId = useRef(1);
  const boot = useRef(snap.boot);

  useEffect(() => link.subscribe((s, events) => {
    if (s.boot !== boot.current) {
      // Reset: start the log and the chart over.
      boot.current = s.boot;
      setLog([]);
      setHistory([sample(s)]);
    }
    setSnap(s);
    setUptime(s.uptime);
    if (!events.length) return;
    setTx((n) => n + 1);
    setLog((prev) => {
      const out = prev.slice();
      for (const e of events) out.push(...merge(out, e, nextId));
      return out.slice(-LOG_MAX);
    });
  }), [link]);

  // Sample telemetry twice a second, but only while the lab is on screen
  // and the tab is visible: no work happens for a demo nobody is looking at.
  useEffect(() => {
    const el = root.current;
    let visible = false;
    let timer = 0;
    const tick = () => {
      const s = link.snapshot();
      setUptime(s.uptime);
      setHistory((h) => [...h, sample(s)].slice(-HISTORY_MAX));
    };
    const update = () => {
      const run = visible && !document.hidden;
      if (run && !timer) timer = window.setInterval(tick, SAMPLE_MS);
      if (!run && timer) { clearInterval(timer); timer = 0; }
    };
    const io = el ? new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; update(); }) : null;
    if (el) io!.observe(el); else { visible = true; update(); }
    document.addEventListener('visibilitychange', update);
    return () => {
      io?.disconnect();
      document.removeEventListener('visibilitychange', update);
      if (timer) clearInterval(timer);
    };
  }, [link, root]);

  const send = useCallback((cmd: Command) => link.send(cmd), [link]);
  const clearLog = useCallback(() => setLog([]), []);
  return { snap, uptime, log, history, tx, send, clearLog };
}

/**
 * A slider drag fires dozens of changes. Rather than flood the console (and
 * screen readers), consecutive events with the same key update one line.
 * Returns the entries to append; mutates `out` in place when merging.
 */
function merge(out: LogEntry[], e: DeviceEvent, nextId: { current: number }): LogEntry[] {
  const last = out[out.length - 1];
  if (e.key && last?.key === e.key && e.at - last.at < MERGE_MS) {
    out[out.length - 1] = { ...last, at: e.at, text: e.text };
    return [];
  }
  return [{ id: nextId.current++, at: e.at, kind: e.kind, text: e.text, key: e.key }];
}
