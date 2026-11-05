// Virtual Hardware Lab: the sixth Lab experiment.
// Layout only. State comes from useDevice(link); the link is a simulator
// today and could be a real board tomorrow (see src/lib/hardware/link.ts).
// Loaded lazily by LabDemos, so this code and its CSS download only when
// someone opens the hardware tab.
import { useCallback, useRef, useState } from 'react';
import { createSimulatedLink } from '../../lib/hardware/link';
import type { LedSpec } from '../../lib/hardware/model';
import ControlPanel from './ControlPanel';
import EventConsole from './EventConsole';
import Telemetry from './Telemetry';
import Workbench, { useBenchSummary } from './Workbench';
import { useDevice } from './useDevice';
import './hardware.css';

export default function HardwareLab() {
  const root = useRef<HTMLDivElement>(null);
  // One simulated board per visit to the tab.
  const [link] = useState(() => createSimulatedLink());
  const { snap, uptime, log, history, tx, send, clearLog } = useDevice(link, root);
  const summary = useBenchSummary(snap);
  const onToggle = useCallback((led: LedSpec) => {
    const s = link.snapshot();
    send({ op: 'output', pin: led.pin, on: !s.state.outputs[led.id].on });
  }, [link, send]);

  return (
    <div ref={root} className="hw">
      <div className="hw-topbar">
        <p className="hw-sim-badge">
          <span className="hw-sim-dot" aria-hidden="true" />
          <span><b>Simulation</b> · no physical hardware is connected. Sensor values are modeled from datasheet curves and run entirely in your browser.</span>
        </p>
        <div className="hw-topbar-actions">
          <span className="hw-mono hw-link" title="Device link transport">link: {link.transport} · {link.label}</span>
          <button type="button" className="hw-btn" onClick={() => send({ op: 'reset' })}>
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 8a5 5 0 1 0 1.6-3.7M3 2.5v2.8h2.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Reset board
          </button>
        </div>
      </div>

      <div className="hw-bench-wrap" role="region" aria-label="Workbench (scrolls sideways on small screens)" tabIndex={0}>
        <Workbench snap={snap} tx={tx} onToggle={onToggle} summary={summary} />
      </div>
      <p className="hw-hint hw-bench-hint">Tip: click an LED on the breadboard to switch it. Lower the ambient light to watch the room darken and the night-light rule kick in.</p>

      <div className="hw-grid">
        <section className="hw-panel" aria-labelledby="hw-ctl-title">
          <div className="hw-panel-head"><h4 id="hw-ctl-title">Control panel</h4></div>
          <ControlPanel snap={snap} send={send} />
        </section>
        <div className="hw-panel hw-stack">
          <Telemetry snap={snap} history={history} uptime={uptime} />
          <EventConsole log={log} onClear={clearLog} />
        </div>
      </div>
    </div>
  );
}
