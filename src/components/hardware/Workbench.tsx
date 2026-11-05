// The virtual workbench: an Uno-style board wired to a breadboard, drawn in
// SVG. Every LED, wire glow and label is driven by the snapshot, so what you
// see is the simulated circuit state, not decoration.
import { memo, useMemo } from 'react';
import { LEDS, describeDuty, type LedSpec, type Snapshot } from '../../lib/hardware/model';

/* ---------- Geometry (viewBox 1000 × 560) ---------- */
const BB = { x: 480, y: 56, w: 500, h: 348 };
const col = (k: number) => 508 + 20 * k;
const ROW = { a: 128, b: 148, c: 168, d: 188, e: 208, f: 248, g: 268, h: 288, i: 308, j: 328 } as const;
const RAIL = { topPos: 76, topNeg: 92, botPos: 364, botNeg: 380 };
const DIGITAL = [['SCL', 'SDA', 'AREF', 'GND', '13', '12', '~11', '~10', '~9', '8'], ['7', '~6', '~5', '4', '~3', '2', 'TX→1', 'RX←0']];
const POWER = [['NC', 'IOREF', 'RESET', '3.3V', '5V', 'GND', 'GND', 'VIN'], ['A0', 'A1', 'A2', 'A3', 'A4', 'A5']];
const dX = (g: number, i: number) => (g === 0 ? 158 : 293) + 13 * i;
const pX = (g: number, i: number) => (g === 0 ? 180 : 290) + 13 * i;
const PIN_X: Record<number, number> = { 13: dX(0, 4), 11: dX(0, 6), 10: dX(0, 7), 9: dX(0, 8) };
const P5V = pX(0, 4), PGND = pX(0, 5), PA0 = pX(1, 0), PA1 = pX(1, 1);

/** Breadboard column for each LED's anode (cathode sits in the next column). */
const LED_COL: Record<string, number> = { cyan: 1, violet: 5, orange: 9 };
const ARC: Record<string, number> = { cyan: 60, violet: 40, orange: 20 };
const signalWire = (l: LedSpec) => { const x = col(LED_COL[l.id]!), p = PIN_X[l.pin]!; return `M${p},136 C${p},${ARC[l.id]} ${x},${ARC[l.id]} ${x},${ROW.a}`; };
const ledPath = (l: LedSpec) => { const x = col(LED_COL[l.id]!); return `M${x},${ROW.a} V${ROW.g} H${x + 20} V${RAIL.botNeg} H${col(0)}`; };
const GND_WIRE = `M${PGND},412 C${PGND},495 ${col(0)},495 ${col(0)},${RAIL.botNeg}`;
const V5_WIRE = `M${P5V},412 C${P5V},522 ${col(1)},522 ${col(1)},${RAIL.botPos}`;
const A0_WIRE = `M${col(15)},${ROW.j} C${col(15)},540 ${PA0},540 ${PA0},412`;
const A1_WIRE = `M${col(20)},${ROW.j} C${col(20)},552 ${PA1},552 ${PA1},412`;

type Props = { snap: Snapshot; tx: number; onToggle: (led: LedSpec) => void; summary: string };

function Workbench({ snap, tx, onToggle, summary }: Props) {
  const { readings: r, duty, state } = snap;
  const lux = state.env.lux;
  // Ambient light: the bench darkens as the simulated room gets darker.
  const darkness = Math.min(0.55, Math.max(0, 0.55 * (1 - Math.log10(lux) / 3)));
  const sun = Math.min(1, Math.log10(lux) / 3);
  const heat = Math.min(1, Math.max(0, (state.env.tempC + 10) / 60));
  const anyOn = LEDS.some((l) => duty[l.id] > 0);

  return (
    <svg className="hw-bench" viewBox="0 0 1000 560" role="img" aria-labelledby="hw-bench-title hw-bench-desc">
      <title id="hw-bench-title">Virtual workbench: Uno-style microcontroller wired to a breadboard</title>
      <desc id="hw-bench-desc">{summary}</desc>
      <defs>
        {LEDS.map((l) => (
          <radialGradient key={l.id} id={`hw-glow-${l.id}`}>
            <stop offset="0" stopColor={`var(--hw-led-${l.id})`} stopOpacity=".95" />
            <stop offset=".35" stopColor={`var(--hw-led-${l.id})`} stopOpacity=".35" />
            <stop offset="1" stopColor={`var(--hw-led-${l.id})`} stopOpacity="0" />
          </radialGradient>
        ))}
        <radialGradient id="hw-glow-l"><stop offset="0" stopColor="var(--hw-led-l)" stopOpacity=".95" /><stop offset="1" stopColor="var(--hw-led-l)" stopOpacity="0" /></radialGradient>
        <linearGradient id="hw-beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--hw-sun)" stopOpacity=".55" /><stop offset="1" stopColor="var(--hw-sun)" stopOpacity="0" /></linearGradient>
        <linearGradient id="hw-metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--hw-metal-hi)" /><stop offset="1" stopColor="var(--hw-metal)" /></linearGradient>
        <pattern id="hw-holes" x={col(0) - 10} y={ROW.a - 10} width="20" height="20" patternUnits="userSpaceOnUse">
          <rect x="7" y="7" width="6" height="6" rx="1.2" className="hw-hole" />
        </pattern>
      </defs>

      {/* ---------- Simulated environment (above the bench) ---------- */}
      <g className="hw-env">
        <polygon points={`${col(19.5) - 6},44 ${col(19.5) + 6},44 ${col(19.5) + 30},${ROW.g} ${col(19.5) - 30},${ROW.g}`} fill="url(#hw-beam)" opacity={sun} />
        <g transform={`translate(${col(19.5)} 28)`}>
          {Array.from({ length: 8 }, (_, i) => <line key={i} x1="0" y1={-11 - 4 * sun} x2="0" y2={-15 - 8 * sun} transform={`rotate(${i * 45})`} className="hw-sun-ray" opacity={0.25 + 0.75 * sun} />)}
          <circle r={6 + 3 * sun} className="hw-sun" opacity={0.35 + 0.65 * sun} />
        </g>
        <text x={col(19.5) + 26} y="25" className="hw-env-label">light</text>
        <text x={col(19.5) + 26} y="38" className="hw-env-value">{Math.round(lux)} lux</text>
        <g transform={`translate(${col(15)} 26)`}>
          <rect x="-4" y="-14" width="8" height="24" rx="4" className="hw-thermo" />
          <rect x="-1.6" y={8 - 20 * heat} width="3.2" height={2 + 20 * heat} rx="1.6" className="hw-thermo-fill" />
          <circle cy="12" r="6" className="hw-thermo-bulb" />
        </g>
        <text x={col(15) - 14} y="25" className="hw-env-label" textAnchor="end">room</text>
        <text x={col(15) - 14} y="38" className="hw-env-value" textAnchor="end">{state.env.tempC.toFixed(1)} °C</text>
      </g>

      {/* ---------- Microcontroller board ---------- */}
      <g className="hw-board">
        <rect x="24" y="120" width="392" height="300" rx="16" className="hw-pcb" />
        <rect x="30" y="126" width="380" height="288" rx="12" className="hw-pcb-edge" />
        {[[44, 400], [398, 404], [398, 160]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="6" className="hw-mount" />)}
        {/* traces on the PCB, purely cosmetic */}
        <path d={`M${PIN_X[9]},146 V200 H300 V290 M${PIN_X[10]},146 V206 H306 V290 M${PIN_X[11]},146 V212 H312 V290 M${PIN_X[13]},146 V170 H130`} className="hw-pcb-trace" />
        <path d={`M${PA0},396 V340 M${PA1},396 V346 H330 V324`} className="hw-pcb-trace" />
        {/* USB-B, barrel jack, regulator, capacitors, crystal, reset */}
        <rect x="6" y="150" width="64" height="50" rx="3" fill="url(#hw-metal)" className="hw-metal-edge" />
        <rect x="16" y="162" width="40" height="26" rx="2" className="hw-port-in" />
        <rect x="6" y="320" width="58" height="44" rx="4" className="hw-jack" />
        <circle cx="26" cy="342" r="9" className="hw-port-in" />
        <rect x="80" y="330" width="26" height="22" rx="2" className="hw-ic" />
        <circle cx="96" cy="298" r="11" className="hw-cap" /><circle cx="124" cy="298" r="11" className="hw-cap" />
        <rect x="120" y="254" width="34" height="12" rx="6" fill="url(#hw-metal)" className="hw-metal-edge" />
        <text x="137" y="263" className="hw-chip-text" textAnchor="middle" fontSize="6">16.000</text>
        <rect x="80" y="128" width="20" height="20" rx="3" className="hw-ic" /><circle cx="90" cy="138" r="5.5" className="hw-button" />
        <text x="90" y="158" className="hw-silk" textAnchor="middle" fontSize="7">RESET</text>
        {/* on-board LEDs: L (D13), TX, RX, ON */}
        <circle cx="118" cy="178" r="22" fill="url(#hw-glow-l)" opacity={snap.statusLed ? 0.85 : 0} className="hw-fade" />
        <rect x="114" y="175" width="9" height="6" rx="1" className={snap.statusLed ? 'hw-smd hw-smd-l is-on' : 'hw-smd'} />
        <rect key={`tx${tx}`} x="114" y="191" width="9" height="6" rx="1" className={tx ? 'hw-smd hw-smd-tx hw-blink' : 'hw-smd'} />
        <rect x="114" y="207" width="9" height="6" rx="1" className="hw-smd" />
        <text x="128" y="181" className="hw-silk" fontSize="8">L</text>
        <text x="128" y="197" className="hw-silk" fontSize="8">TX</text>
        <text x="128" y="213" className="hw-silk" fontSize="8">RX</text>
        <rect x="380" y="226" width="9" height="6" rx="1" className="hw-smd hw-smd-on" />
        <text x="378" y="232" className="hw-silk" fontSize="8" textAnchor="end">ON</text>
        {/* branding */}
        <text x="200" y="240" className="hw-logo">kads<tspan className="hw-logo-dot">.</tspan>lab</text>
        <text x="202" y="256" className="hw-silk" fontSize="8" letterSpacing="1.5">UNO-STYLE · 5 V · 16 MHz · VIRTUAL</text>
        {/* MCU, DIP-28 */}
        <rect x="210" y="290" width="180" height="34" rx="2" className="hw-ic" />
        {Array.from({ length: 14 }, (_, i) => <g key={i}><rect x={216 + 12.6 * i} y="285" width="4" height="5" className="hw-leg" /><rect x={216 + 12.6 * i} y="324" width="4" height="5" className="hw-leg" /></g>)}
        <path d="M210,301 a6,6 0 0 1 0,12" className="hw-notch" />
        <text x="300" y="311" className="hw-chip-text" textAnchor="middle">KL328P · 32 KB</text>
        <text x="300" y="186" className="hw-silk" textAnchor="middle" fontSize="8" letterSpacing="1.5">DIGITAL (PWM ~)</text>
        <text x="225" y="372" className="hw-silk" textAnchor="middle" fontSize="8" letterSpacing="1.5">POWER</text>
        <text x="322" y="372" className="hw-silk" textAnchor="middle" fontSize="8" letterSpacing="1.5">ANALOG IN</text>

        {/* digital header (top) */}
        <rect x="151" y="128" width="131" height="16" rx="2" className="hw-header" />
        <rect x="286" y="128" width="105" height="16" rx="2" className="hw-header" />
        {DIGITAL.map((g, gi) => g.map((label, i) => {
          const x = dX(gi, i);
          const pin = Number(label.replace(/\D/g, ''));
          const led = gi === 0 ? LEDS.find((l) => l.pin === pin) : undefined;
          const live = led ? duty[led.id] > 0 : pin === 13 && gi === 0 && snap.statusLed;
          return (
            <g key={label}>
              <rect x={x - 3} y="133" width="6" height="6" rx="1" className={live ? 'hw-pin is-live' : 'hw-pin'} style={led && live ? { fill: `var(--hw-led-${led.id})` } : undefined} />
              <text x={x} y="150" className={led || (gi === 0 && pin === 13) ? 'hw-pin-label is-used' : 'hw-pin-label'} transform={`rotate(-90 ${x} 150)`} textAnchor="end">{label}</text>
            </g>
          );
        }))}
        {/* power + analog header (bottom) */}
        <rect x="173" y="396" width="105" height="16" rx="2" className="hw-header" />
        <rect x="283" y="396" width="79" height="16" rx="2" className="hw-header" />
        {POWER.map((g, gi) => g.map((label, i) => {
          const x = pX(gi, i);
          const used = (gi === 0 && (i === 4 || i === 5)) || (gi === 1 && i < 2);
          return (
            <g key={`${gi}${label}${i}`}>
              <rect x={x - 3} y="401" width="6" height="6" rx="1" className={used ? 'hw-pin is-live' : 'hw-pin'} />
              <text x={x} y="392" className={used ? 'hw-pin-label is-used' : 'hw-pin-label'} transform={`rotate(-90 ${x} 392)`}>{label}</text>
            </g>
          );
        }))}
      </g>

      {/* ---------- Breadboard ---------- */}
      <g className="hw-bb">
        <rect x={BB.x} y={BB.y} width={BB.w} height={BB.h} rx="10" className="hw-bb-body" />
        <rect x={BB.x + 6} y={ROW.e + 14} width={BB.w - 12} height="12" rx="3" className="hw-bb-groove" />
        <line x1={BB.x + 14} x2={BB.x + BB.w - 14} y1={RAIL.topPos - 10} y2={RAIL.topPos - 10} className="hw-rail-pos" />
        <line x1={BB.x + 14} x2={BB.x + BB.w - 14} y1={RAIL.topNeg + 10} y2={RAIL.topNeg + 10} className="hw-rail-neg" />
        <line x1={BB.x + 14} x2={BB.x + BB.w - 14} y1={RAIL.botPos - 10} y2={RAIL.botPos - 10} className="hw-rail-pos" />
        <line x1={BB.x + 14} x2={BB.x + BB.w - 14} y1={RAIL.botNeg + 10} y2={RAIL.botNeg + 10} className="hw-rail-neg" />
        {[RAIL.topPos, RAIL.topNeg, RAIL.botPos, RAIL.botNeg].map((y, ri) => (
          <g key={y}>
            <text x={BB.x + 10} y={y + 3.5} className="hw-bb-text" textAnchor="middle">{ri % 2 ? '−' : '+'}</text>
            {Array.from({ length: 24 }, (_, k) => (k % 6 === 5 ? null : <rect key={k} x={col(k) - 3} y={y - 3} width="6" height="6" rx="1.2" className="hw-hole" />))}
          </g>
        ))}
        <rect x={col(0) - 10} y={ROW.a - 10} width={480} height={100} fill="url(#hw-holes)" />
        <rect x={col(0) - 10} y={ROW.f - 10} width={480} height={100} fill="url(#hw-holes)" />
        {Object.entries(ROW).map(([k, y]) => <text key={k} x={BB.x + 12} y={y + 3} className="hw-bb-text" textAnchor="middle">{k}</text>)}
        {[1, 5, 10, 15, 20].map((n) => <text key={n} x={col(n - 1)} y={ROW.a - 13} className="hw-bb-text" textAnchor="middle">{n}</text>)}
      </g>

      {/* ---------- Components on the breadboard ---------- */}
      {LEDS.map((l) => {
        const x = col(LED_COL[l.id]!);
        return (
          <g key={l.id}>
            <Resistor x={x} y1={ROW.e} y2={ROW.f} bands={['red', 'red', 'brown']} />
            <text x={x + 9} y={ROW.e + 24} className="hw-part-label">220 Ω</text>
            <Jumper x1={x + 20} y1={ROW.j} x2={x + 20} y2={RAIL.botNeg} kind="gnd" />
          </g>
        );
      })}
      {/* TMP36 on A0: +Vs, Vout, GND in columns 15–17 */}
      <circle cx={col(15)} cy={ROW.h + 2} r="30" className="hw-heat" style={{ opacity: 0.15 + Math.abs(heat - 0.53) * 1.1, fill: heat > 0.53 ? 'var(--hw-hot)' : 'var(--hw-cold)' }} />
      <path d={`M${col(14) - 10},${ROW.h - 9} H${col(16) + 10} V${ROW.h + 1} Q${col(15)},${ROW.h + 22} ${col(14) - 10},${ROW.h + 1} Z`} className="hw-to92" />
      <text x={col(15)} y={ROW.h + 3} className="hw-chip-text" textAnchor="middle" fontSize="7">TMP36</text>
      <Jumper x1={col(14)} y1={ROW.j} x2={col(14)} y2={RAIL.botPos} kind="pwr" />
      <Jumper x1={col(16)} y1={ROW.j} x2={col(16)} y2={RAIL.botNeg} kind="gnd" />
      {/* Photoresistor on A1, 10 kΩ pull-down to GND */}
      <circle cx={col(19.5)} cy={ROW.g} r={14 + 10 * sun} className="hw-ldr-glow" opacity={0.15 + 0.6 * sun} />
      <circle cx={col(19.5)} cy={ROW.g} r="11" className="hw-ldr" />
      <path d={`M${col(19.5) - 6},${ROW.g - 5} h12 l-12,3.4 h12 l-12,3.4 h12`} className="hw-ldr-track" />
      <Jumper x1={col(19)} y1={ROW.j} x2={col(19)} y2={RAIL.botPos} kind="pwr" />
      <Resistor x={col(20)} y1={ROW.i} x2={col(22)} bands={['brown', 'black', 'orange']} horizontal />
      <text x={col(21)} y={ROW.i + 17} className="hw-part-label" textAnchor="middle">10 kΩ</text>
      <Jumper x1={col(22)} y1={ROW.j} x2={col(22)} y2={RAIL.botNeg} kind="gnd" />
      <text x={col(15)} y={ROW.f - 8} className="hw-part-label" textAnchor="middle">A0 · {r.temp.volts.toFixed(2)} V</text>
      <text x={col(19.5)} y={ROW.f - 8} className="hw-part-label" textAnchor="middle">A1 · {r.light.volts.toFixed(2)} V</text>

      {/* ---------- Wires ---------- */}
      <Wire d={V5_WIRE} kind="pwr" />
      <Wire d={GND_WIRE} kind="gnd" />
      <Wire d={A0_WIRE} kind="a0" />
      <Wire d={A1_WIRE} kind="a1" />
      {LEDS.map((l) => <Wire key={l.id} d={signalWire(l)} kind={l.id} />)}

      {/* Room darkness sits above the hardware but below anything that emits light. */}
      <rect width="1000" height="560" className="hw-dark" style={{ opacity: darkness }} />

      {/* ---------- Light and current (above the darkness) ---------- */}
      {LEDS.map((l) => {
        const d = duty[l.id];
        const x = col(LED_COL[l.id]!) + 10;
        const lvl = d / 255;
        return (
          <g key={l.id}>
            <circle cx={x} cy={ROW.g} r="46" fill={`url(#hw-glow-${l.id})`} opacity={Math.sqrt(lvl)} className="hw-fade" />
            {d > 0 && (
              <>
                <path d={signalWire(l)} className="hw-flow" style={{ stroke: `var(--hw-led-${l.id})`, animationDuration: `${1.6 - lvl}s` }} />
                <path d={ledPath(l)} className="hw-flow" style={{ stroke: `var(--hw-led-${l.id})`, animationDuration: `${1.6 - lvl}s` }} />
              </>
            )}
            <g className="hw-led" onClick={() => onToggle(l)}>
              <title>{`${l.name} on D${l.pin}: click to switch it ${d > 0 ? 'off' : 'on'}`}</title>
              <circle cx={x} cy={ROW.g} r="16" className="hw-hit" />
              <circle cx={x} cy={ROW.g} r="10.5" className="hw-led-body" style={{ fill: `var(--hw-led-${l.id})`, fillOpacity: 0.28 + 0.72 * lvl }} />
              <path d={`M${x + 7},${ROW.g - 7.5} a10.5,10.5 0 0 1 0,15`} className="hw-led-flat" />
              <circle cx={x - 3.5} cy={ROW.g - 3.5} r="3" className="hw-led-shine" />
            </g>
            <LedTag x={col(LED_COL[l.id]!) + 14} pin={l.pin} duty={d} />
          </g>
        );
      })}
      {anyOn && <path d={GND_WIRE} className="hw-flow hw-flow-gnd" />}
      <text x="24" y="545" className="hw-stamp">Simulated in your browser · no hardware connected</text>
    </svg>
  );
}

function LedTag({ x, pin, duty }: { x: number; pin: number; duty: number }) {
  const d = describeDuty(duty);
  return (
    <g className="hw-tag">
      <rect x={x} y={ROW.b - 13} width="58" height="32" rx="5" />
      <text x={x + 6} y={ROW.b}>D{pin} ~PWM</text>
      <text x={x + 6} y={ROW.b + 13} className={duty > 0 ? 'hw-tag-val is-on' : 'hw-tag-val'}>{d.mode === 'PWM' ? `${d.percent}%` : d.mode}</text>
    </g>
  );
}

const BAND: Record<string, string> = { red: '#C8352B', brown: '#7A4A25', black: '#1B1B1F', orange: '#E07B1F', gold: '#C9A23A' };
function Resistor({ x, y1, x2, y2, bands, horizontal }: { x: number; y1: number; x2?: number; y2?: number; bands: string[]; horizontal?: boolean }) {
  if (horizontal) {
    const xe = x2!, mid = (x + xe) / 2;
    return (
      <g>
        <line x1={x} y1={y1} x2={xe} y2={y1} className="hw-lead" />
        <rect x={mid - 13} y={y1 - 5.5} width="26" height="11" rx="5" className="hw-res" />
        {[...bands, 'gold'].map((b, i) => <rect key={i} x={mid - 8 + i * 4.6 + (i === 3 ? 2 : 0)} y={y1 - 5.5} width="2.4" height="11" fill={BAND[b]} />)}
      </g>
    );
  }
  const ye = y2!, mid = (y1 + ye) / 2;
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={ye} className="hw-lead" />
      <rect x={x - 5.5} y={mid - 13} width="11" height="26" rx="5" className="hw-res" />
      {[...bands, 'gold'].map((b, i) => <rect key={i} x={x - 5.5} y={mid - 8 + i * 4.6 + (i === 3 ? 2 : 0)} width="11" height="2.4" fill={BAND[b]} />)}
    </g>
  );
}

function Jumper({ x1, y1, x2, y2, kind }: { x1: number; y1: number; x2: number; y2: number; kind: 'pwr' | 'gnd' }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} className={`hw-jumper hw-wire-${kind}`} />;
}

function Wire({ d, kind }: { d: string; kind: string }) {
  return (
    <g className={`hw-wire hw-wire-${kind}`}>
      <path d={d} className="hw-wire-shadow" />
      <path d={d} className="hw-wire-core" />
      <path d={d} className="hw-wire-shine" />
    </g>
  );
}

export default memo(Workbench);

/** Plain-language description of the circuit state, for the SVG's <desc>. */
export function useBenchSummary(snap: Snapshot) {
  return useMemo(() => {
    const leds = LEDS.map((l) => {
      const d = describeDuty(snap.duty[l.id]);
      return `${l.name} on D${l.pin} ${d.mode === 'PWM' ? `at ${d.percent}% PWM` : d.mode === 'HIGH' ? 'fully on' : 'off'}`;
    }).join(', ');
    return `${leds}. On-board L LED ${snap.statusLed ? 'on' : 'off'}. TMP36 on A0 reads ${snap.readings.temp.c.toFixed(1)} °C; photoresistor on A1 reads ${Math.round(snap.readings.light.lux)} lux.`;
  }, [snap]);
}
