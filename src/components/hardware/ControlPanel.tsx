// Controls for the virtual board. Every control sends a Command through the
// device link; nothing here changes state directly.
import { memo, useId } from 'react';
import type { Command } from '../../lib/hardware/device';
import { ENV_LIMITS, LEDS, RULES, codeFor, describeDuty, ownerOf, type Snapshot } from '../../lib/hardware/model';

type Props = { snap: Snapshot; send: (cmd: Command) => void };

// Light spans three orders of magnitude, so its slider is logarithmic:
// position 0–300 maps to 1–1 000 lux.
const toLux = (pos: number) => Math.round(Math.pow(10, pos / 100));
const toPos = (lux: number) => Math.round(Math.log10(Math.max(1, lux)) * 100);
const LIGHT_PRESETS = [{ label: 'Night', lux: 2 }, { label: 'Dusk', lux: 40 }, { label: 'Indoor', lux: 320 }, { label: 'Daylight', lux: 1000 }];
const TEMP_PRESETS = [{ label: 'Cold', c: 4 }, { label: 'Room', c: 22 }, { label: 'Hot', c: 38 }];

function ControlPanel({ snap, send }: Props) {
  const { state, readings: r } = snap;
  return (
    <div className="hw-controls">
      <fieldset className="hw-group">
        <legend><span className="hw-group-kicker">outputs</span>LEDs on PWM pins</legend>
        {LEDS.map((l) => <LedControl key={l.id} led={l} snap={snap} send={send} />)}
      </fieldset>

      <fieldset className="hw-group">
        <legend><span className="hw-group-kicker">inputs · simulated</span>Environment</legend>
        <p className="hw-note">You’re playing the weather. The board only sees the sensor voltages these produce.</p>
        <Slider label="Room temperature" unit="°C" min={ENV_LIMITS.tempC.min} max={ENV_LIMITS.tempC.max} step={0.5}
          value={state.env.tempC} display={`${state.env.tempC.toFixed(1)} °C`}
          valueText={`${state.env.tempC.toFixed(1)} degrees Celsius`}
          onChange={(v) => send({ op: 'sim.env', tempC: v })}
          hint={`TMP36 → A0 reads ${r.temp.c.toFixed(1)} °C`} />
        <Presets label="Temperature presets" items={TEMP_PRESETS.map((p) => ({ label: p.label, on: state.env.tempC === p.c, go: () => send({ op: 'sim.env', tempC: p.c }) }))} />
        <Slider label="Ambient light" unit="lux" min={0} max={300} step={1}
          value={toPos(state.env.lux)} display={`${Math.round(state.env.lux)} lux`}
          valueText={`${Math.round(state.env.lux)} lux`}
          onChange={(v) => send({ op: 'sim.env', lux: toLux(v) })}
          hint={`Photoresistor → A1 reads ${Math.round(r.light.lux)} lux (logarithmic slider)`} />
        <Presets label="Light presets" items={LIGHT_PRESETS.map((p) => ({ label: p.label, on: Math.round(state.env.lux) === p.lux, go: () => send({ op: 'sim.env', lux: p.lux }) }))} />
      </fieldset>

      <fieldset className="hw-group">
        <legend><span className="hw-group-kicker">firmware</span>Automation rules</legend>
        <div className="hw-rules">
        {RULES.map((spec) => {
          const rule = state.rules[spec.id];
          const isLight = spec.input === 'A1';
          const value = isLight ? r.light.lux : r.temp.c;
          const fmt = (v: number) => (isLight ? `${Math.round(v)} lux` : `${v.toFixed(1)} °C`);
          const op = isLight ? '<' : '>';
          const cond = `${spec.input} ${fmt(value)} ${rule.active ? op : isLight ? '≥' : '≤'} ${fmt(rule.threshold)}`;
          const target = spec.output === 13 ? 'on-board L LED (D13)' : `orange LED (D${spec.output})`;
          return (
            <div key={spec.id} className={`hw-rule${rule.enabled ? '' : ' is-off'}${rule.active ? ' is-active' : ''}`}>
              <Switch label={`${spec.name} rule`} on={rule.enabled} onChange={(on) => send({ op: 'rule', id: spec.id, enabled: on })}
                detail={isLight ? `When light drops below the threshold, turn on the ${target}.` : `When it gets hotter than the threshold, turn on the ${target}.`} />
              <Slider label={`${spec.name} threshold`} unit={spec.unit} min={spec.min} max={spec.max} step={spec.step}
                value={rule.threshold} display={fmt(rule.threshold)} valueText={fmt(rule.threshold)} disabled={!rule.enabled}
                onChange={(v) => send({ op: 'rule', id: spec.id, threshold: v })} />
              <p className="hw-rule-status">
                <span className="hw-rule-dot" aria-hidden="true" />
                {!rule.enabled ? <>Disabled · D{spec.output} is under manual control</>
                  : rule.active ? <><b>Triggered</b> by {cond} → D{spec.output} HIGH</>
                  : <><b>Watching</b> {cond} → D{spec.output} LOW</>}
              </p>
              <code className="hw-code">if ({isLight ? 'lux' : 'tempC'} {op} {isLight ? rule.threshold : rule.threshold.toFixed(1)}) digitalWrite({spec.output}, HIGH); else digitalWrite({spec.output}, LOW);</code>
            </div>
          );
        })}
        </div>
      </fieldset>
    </div>
  );
}

function LedControl({ led, snap, send }: { led: (typeof LEDS)[number]; snap: Snapshot } & Pick<Props, 'send'>) {
  const out = snap.state.outputs[led.id];
  const owner = ownerOf(snap.state, led.pin);
  const duty = snap.duty[led.id];
  const d = describeDuty(duty);
  const noteId = useId();
  return (
    <div className={`hw-led-row${owner ? ' is-owned' : ''}`} style={{ ['--led' as string]: `var(--hw-led-${led.id})` }}>
      <Switch label={`${led.name} (D${led.pin})`} on={owner ? duty > 0 : out.on} disabled={!!owner} describedBy={owner ? noteId : undefined}
        onChange={(on) => send({ op: 'output', pin: led.pin, on })} />
      <Slider label={`${led.name} brightness`} unit="" min={0} max={255} step={1} value={owner ? duty : out.duty} disabled={!!owner}
        display={`${out.duty}/255`} valueText={`${owner ? duty : out.duty} of 255, ${Math.round(((owner ? duty : out.duty) / 255) * 100)} percent duty cycle`}
        onChange={(v) => send({ op: 'output', pin: led.pin, duty: v })} compact />
      <div className="hw-led-out">
        <Wave duty={duty} />
        <output className="hw-led-state">
          <b>{d.mode === 'PWM' ? `PWM ${d.percent}%` : d.mode}</b>
          <code>{codeFor(led.pin, duty)}</code>
        </output>
      </div>
      {owner && <p id={noteId} className="hw-note hw-owned-note">Driven by the {owner.name.toLowerCase()} rule. Turn the rule off to control it by hand.</p>}
    </div>
  );
}

/** A tiny square wave: the visible shape of the PWM duty cycle. */
function Wave({ duty }: { duty: number }) {
  const w = 18, hi = 2, lo = 14, on = (duty / 255) * w;
  let d = `M0,${lo}`;
  for (let i = 0; i < 4; i++) {
    const x = i * w;
    d += duty <= 0 ? ` H${x + w}` : duty >= 255 ? ` V${hi} H${x + w}` : ` V${hi} H${x + on} V${lo} H${x + w}`;
  }
  return <svg className="hw-wave" viewBox="0 0 72 16" aria-hidden="true"><path d={d} /></svg>;
}

function Switch({ label, on, onChange, disabled, detail, describedBy }: { label: string; on: boolean; onChange: (on: boolean) => void; disabled?: boolean; detail?: string; describedBy?: string }) {
  const id = useId();
  return (
    <div className="hw-switch-row">
      <button type="button" role="switch" aria-checked={on} disabled={disabled} className="hw-switch" onClick={() => onChange(!on)}
        aria-labelledby={`${id}-l`} aria-describedby={[detail ? `${id}-d` : '', describedBy ?? ''].filter(Boolean).join(' ') || undefined}>
        <span className="hw-switch-knob" />
      </button>
      <span>
        <span id={`${id}-l`} className="hw-switch-label">{label}</span>
        {detail && <span id={`${id}-d`} className="hw-switch-detail">{detail}</span>}
      </span>
    </div>
  );
}

function Slider({ label, min, max, step, value, onChange, display, valueText, hint, disabled, compact }: {
  label: string; unit: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void;
  display: string; valueText: string; hint?: string; disabled?: boolean; compact?: boolean;
}) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={`hw-slider${compact ? ' is-compact' : ''}`}>
      <div className="hw-slider-head">
        <label htmlFor={id} className={compact ? 'sr-only' : undefined}>{label}</label>
        {!compact && <span className="hw-slider-value" aria-hidden="true">{display}</span>}
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} disabled={disabled}
        aria-valuetext={valueText} aria-describedby={hint ? `${id}-h` : undefined}
        style={{ ['--pct' as string]: `${pct}%` }}
        onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <p id={`${id}-h`} className="hw-hint">{hint}</p>}
    </div>
  );
}

function Presets({ label, items }: { label: string; items: { label: string; on: boolean; go: () => void }[] }) {
  return (
    <div className="hw-presets" role="group" aria-label={label}>
      {items.map((p) => <button key={p.label} type="button" aria-pressed={p.on} onClick={p.go}>{p.label}</button>)}
    </div>
  );
}

export default memo(ControlPanel);
