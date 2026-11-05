// Live telemetry: readouts, a 30-second signal history and the GPIO table.
// The history is three stacked bands on one time axis (each band has its own
// scale, never a second y-axis on the same plot), with one shared crosshair.
import { useEffect, useRef, useState } from 'react';
import { LEDS, describeDuty, ledCurrentMa, ownerOf, type Snapshot } from '../../lib/hardware/model';
import type { Sample } from './useDevice';

const PAD_L = 44, PAD_R = 56;
const BAND_H = 64, GAP = 14, LANE_H = 13;
const TEMP_Y = 8, LIGHT_Y = TEMP_Y + BAND_H + GAP, LANES_Y = LIGHT_Y + BAND_H + GAP;
const LANES = [...LEDS.map((l) => ({ key: l.id, label: `D${l.pin}`, color: `var(--hw-led-${l.id})` })), { key: 'status', label: 'D13', color: 'var(--hw-led-l)' }] as const;
const H = LANES_Y + LANES.length * (LANE_H + 4) + 18;
const WINDOW_MS = 30_000;

export function fmtUptime(ms: number) {
  const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000), x = ms % 1000;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(x).padStart(3, '0')}`;
}

export default function Telemetry({ snap, history, uptime }: { snap: Snapshot; history: Sample[]; uptime: number }) {
  const r = snap.readings;
  return (
    <section className="hw-telemetry" aria-labelledby="hw-tel-title">
      <div className="hw-panel-head">
        <h4 id="hw-tel-title">Live telemetry</h4>
        <span className="hw-mono">uptime {fmtUptime(uptime)}</span>
      </div>
      <div className="hw-readouts">
        <Readout label="Temperature · A0" value={r.temp.c.toFixed(1)} unit="°C" sub={`ADC ${r.temp.adc}/1023 · ${r.temp.volts.toFixed(3)} V · ${(r.temp.c * 9 / 5 + 32).toFixed(1)} °F`} tone="coral" />
        <Readout label="Ambient light · A1" value={String(Math.round(r.light.lux))} unit="lux" sub={`ADC ${r.light.adc}/1023 · ${r.light.volts.toFixed(2)} V · LDR ${(r.light.ohms / 1000).toFixed(1)} kΩ`} tone="primary" />
        <Readout label="Supply current · 5 V" value={snap.currentMa.toFixed(1)} unit="mA" sub={`${(snap.currentMa * 5 / 1000).toFixed(2)} W · board idle 46 mA + LEDs`} tone="violet" />
      </div>
      <History history={history} />
      <GpioTable snap={snap} />
    </section>
  );
}

function Readout({ label, value, unit, sub, tone }: { label: string; value: string; unit: string; sub: string; tone: string }) {
  return (
    <div className={`hw-readout tone-${tone}`}>
      <span className="hw-readout-label">{label}</span>
      <span className="hw-readout-value">{value}<small> {unit}</small></span>
      <span className="hw-readout-sub">{sub}</span>
    </div>
  );
}

function History({ history }: { history: Sample[] }) {
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  // Draw at the plot's real pixel width, so labels keep their true size on a
  // phone instead of shrinking with a scaled viewBox.
  const wrap = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(600);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e!.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const last = history[history.length - 1];
  if (!last) return null;
  const x = (t: number) => W - PAD_R - ((last.t - t) / WINDOW_MS) * (W - PAD_L - PAD_R);
  const temps = history.map((s) => s.tempC);
  const tMin = Math.floor(Math.min(...temps) - 1), tMax = Math.ceil(Math.max(Math.max(...temps) + 1, tMin + 4));
  const yT = (c: number) => TEMP_Y + BAND_H - ((c - tMin) / (tMax - tMin)) * BAND_H;
  const yL = (lux: number) => LIGHT_Y + BAND_H - (Math.log10(Math.max(1, lux)) / 3) * BAND_H;
  const line = (f: (s: Sample) => number) => history.map((s, i) => `${i ? 'L' : 'M'}${x(s.t).toFixed(1)},${f(s).toFixed(1)}`).join(' ');
  const dt = 500 * ((W - PAD_L - PAD_R) / WINDOW_MS);
  const h = hover === null ? null : history[hover];

  const onMove = (e: React.PointerEvent) => {
    const box = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    let best = 0, dist = Infinity;
    history.forEach((s, i) => { const d = Math.abs(x(s.t) - px); if (d < dist) { dist = d; best = i; } });
    setHover(best);
  };

  const summary = `Last ${Math.round((last.t - history[0]!.t) / 1000)} seconds. Temperature ${Math.min(...temps).toFixed(1)} to ${Math.max(...temps).toFixed(1)} °C, now ${last.tempC.toFixed(1)}. Light now ${Math.round(last.lux)} lux.`;
  return (
    <figure className="hw-history">
      <figcaption className="hw-history-cap"><span>Signal history</span><span className="hw-mono">last 30 s · sampled every 0.5 s</span></figcaption>
      <div className="hw-history-plot" ref={wrap}>
        <svg ref={ref} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
          {/* temperature band */}
          <text x="0" y={TEMP_Y + 10} className="hw-axis">°C</text>
          <text x={PAD_L - 6} y={TEMP_Y + 4} className="hw-axis" textAnchor="end">{tMax}</text>
          <text x={PAD_L - 6} y={TEMP_Y + BAND_H} className="hw-axis" textAnchor="end">{tMin}</text>
          <line x1={PAD_L} x2={W - PAD_R} y1={TEMP_Y + BAND_H} y2={TEMP_Y + BAND_H} className="hw-gridline" />
          <path d={line((s) => yT(s.tempC))} className="hw-line hw-line-temp" />
          <circle cx={x(last.t)} cy={yT(last.tempC)} r="4" className="hw-line-end hw-line-temp" />
          <text x={W - PAD_R + 8} y={yT(last.tempC) + 4} className="hw-direct">{last.tempC.toFixed(1)}°</text>
          {/* light band (log scale) */}
          <text x="0" y={LIGHT_Y + 10} className="hw-axis">lux</text>
          {[1000, 10].map((v) => <text key={v} x={PAD_L - 6} y={yL(v) + 4} className="hw-axis" textAnchor="end">{v >= 1000 ? '1k' : v}</text>)}
          <line x1={PAD_L} x2={W - PAD_R} y1={LIGHT_Y + BAND_H} y2={LIGHT_Y + BAND_H} className="hw-gridline" />
          <line x1={PAD_L} x2={W - PAD_R} y1={yL(100)} y2={yL(100)} className="hw-gridline hw-grid-soft" />
          <path d={line((s) => yL(s.lux))} className="hw-line hw-line-light" />
          <circle cx={x(last.t)} cy={yL(last.lux)} r="4" className="hw-line-end hw-line-light" />
          <text x={W - PAD_R + 8} y={yL(last.lux) + 4} className="hw-direct">{Math.round(last.lux)}</text>
          {/* output lanes, like a logic analyzer: bar height = duty cycle */}
          {LANES.map((lane, li) => {
            const y0 = LANES_Y + li * (LANE_H + 4);
            return (
              <g key={lane.key}>
                <text x={PAD_L - 6} y={y0 + LANE_H - 2} className="hw-axis" textAnchor="end">{lane.label}</text>
                <line x1={PAD_L} x2={W - PAD_R} y1={y0 + LANE_H} y2={y0 + LANE_H} className="hw-gridline hw-grid-soft" />
                {history.map((s) => {
                  const v = lane.key === 'status' ? (s.status ? 255 : 0) : s.duty[lane.key];
                  if (!v) return null;
                  const hgt = Math.max(2, (v / 255) * LANE_H);
                  return <rect key={s.t} x={x(s.t) - dt} y={y0 + LANE_H - hgt} width={Math.max(1, dt - 1)} height={hgt} rx="1" style={{ fill: lane.color }} />;
                })}
              </g>
            );
          })}
          <text x={PAD_L} y={H - 2} className="hw-axis">−30 s</text>
          <text x={W - PAD_R} y={H - 2} className="hw-axis" textAnchor="end">now</text>
          {h && (
            <g className="hw-crosshair">
              <line x1={x(h.t)} x2={x(h.t)} y1={TEMP_Y} y2={H - 14} />
              <circle cx={x(h.t)} cy={yT(h.tempC)} r="4" className="hw-line-temp" />
              <circle cx={x(h.t)} cy={yL(h.lux)} r="4" className="hw-line-light" />
            </g>
          )}
        </svg>
        {h && (
          <div className="hw-tooltip" style={{ left: `${(x(h.t) / W) * 100}%` }} aria-hidden="true">
            <b>{((h.t - last.t) / 1000).toFixed(1)} s</b>
            <span>{h.tempC.toFixed(1)} °C · {Math.round(h.lux)} lux</span>
            <span>{LEDS.map((l) => `D${l.pin} ${describeDuty(h.duty[l.id]).percent}%`).join(' · ')} · D13 {h.status ? 'HIGH' : 'LOW'}</span>
          </div>
        )}
      </div>
    </figure>
  );
}

function GpioTable({ snap }: { snap: Snapshot }) {
  const r = snap.readings;
  const rows = [
    ...LEDS.map((l) => {
      const duty = snap.duty[l.id];
      const owner = ownerOf(snap.state, l.pin);
      const d = describeDuty(duty);
      return { pin: `D${l.pin}`, role: `${l.name} · 220 Ω`, mode: 'OUTPUT ~PWM', state: d.mode === 'PWM' ? `PWM ${d.percent}% (${duty})` : d.mode, extra: duty > 0 ? `${ledCurrentMa(l, duty).toFixed(1)} mA` : '0 mA', by: owner ? `rule: ${owner.name.toLowerCase()}` : 'manual', live: duty > 0 };
    }),
    { pin: 'D13', role: 'On-board L LED', mode: 'OUTPUT', state: snap.statusLed ? 'HIGH' : 'LOW', extra: snap.statusLed ? '2.0 mA' : '0 mA', by: snap.state.rules.overheat.enabled ? 'rule: over-temperature alert' : 'idle', live: snap.statusLed },
    { pin: 'A0', role: 'TMP36 temperature', mode: 'INPUT · ADC', state: `${r.temp.adc}`, extra: `${r.temp.volts.toFixed(3)} V`, by: 'sensor', live: true },
    { pin: 'A1', role: 'Photoresistor + 10 kΩ', mode: 'INPUT · ADC', state: `${r.light.adc}`, extra: `${r.light.volts.toFixed(2)} V`, by: 'sensor', live: true },
  ];
  return (
    <div className="hw-table-wrap">
      <table className="hw-table">
        <caption className="sr-only">GPIO pin states</caption>
        <thead><tr><th scope="col">Pin</th><th scope="col">Connected to</th><th scope="col">Mode</th><th scope="col">State</th><th scope="col">Electrical</th><th scope="col">Driven by</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.pin} className={row.live ? 'is-live' : undefined}>
              <th scope="row"><span className="hw-dot" aria-hidden="true" />{row.pin}</th>
              <td>{row.role}</td><td>{row.mode}</td><td><b>{row.state}</b></td><td>{row.extra}</td><td>{row.by}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
