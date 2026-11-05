// The virtual device: commands in, new state + events out.
//
// `Command` is the protocol. It is plain, JSON-serializable data on purpose:
// the same messages could later travel over a WebSocket to an ESP32, or over
// Web Serial to an Arduino running matching firmware. Only `sim.env` is
// simulator-only, because on a real board the environment is, well, real.
import {
  LEDS, RULES, ENV_LIMITS, clamp, codeFor, describeDuty, initialState, ledCurrentMa, ownerOf, pinDuty, readSensors, statusLed,
  type DeviceState, type PwmPin, type RuleId,
} from './model';

export type Command =
  | { op: 'output'; pin: PwmPin; on?: boolean; duty?: number }
  | { op: 'rule'; id: RuleId; enabled?: boolean; threshold?: number }
  | { op: 'sim.env'; tempC?: number; lux?: number }
  | { op: 'reset' };

export type EventKind = 'sys' | 'gpio' | 'sensor' | 'rule' | 'warn';
export type DeviceEvent = {
  /** Device uptime in ms when it happened. */
  at: number;
  kind: EventKind;
  text: string;
  /** Events with the same key, close together (e.g. a slider drag), merge into one log line. */
  key?: string;
};

type Result = { state: DeviceState; events: DeviceEvent[] };

const fmtLux = (v: number) => `${Math.round(v)} lux`;
const fmtC = (v: number) => `${v.toFixed(1)} °C`;

/**
 * The firmware loop. Real firmware would run this every few milliseconds;
 * here it runs after every command, which gives the same result because
 * nothing changes between commands.
 */
function runFirmware(prev: DeviceState, next: DeviceState, at: number): Result {
  const r = readSensors(next.env);
  const events: DeviceEvent[] = [];
  const rules = { ...next.rules };
  for (const spec of RULES) {
    const rule = rules[spec.id];
    const value = spec.input === 'A1' ? r.light.lux : r.temp.c;
    const active = rule.enabled && (spec.id === 'night-light' ? value < rule.threshold : value > rule.threshold);
    if (active !== rule.active) {
      rules[spec.id] = { ...rule, active };
      if (rule.enabled) {
        const cmp = spec.id === 'night-light' ? (active ? '<' : '≥') : (active ? '>' : '≤');
        const reading = spec.input === 'A1' ? fmtLux(value) : fmtC(value);
        const limit = spec.id === 'night-light' ? fmtLux(rule.threshold) : fmtC(rule.threshold);
        events.push({ at, kind: 'rule', text: `${spec.name} ${active ? 'TRIGGERED' : 'cleared'}: ${spec.input} reads ${reading} ${cmp} ${limit} → D${spec.output} ${active ? 'HIGH' : 'LOW'}` });
      }
    }
  }
  const state = { ...next, rules };
  // Log any pin the firmware changed on its own (rule outputs).
  for (const led of LEDS) {
    const before = pinDuty(prev, led), after = pinDuty(state, led);
    if (before !== after && ownerOf(state, led.pin)) events.push(gpioEvent(at, led.pin, after, led.name, 'rule'));
  }
  if (statusLed(prev) !== statusLed(state)) {
    events.push({ at, kind: 'gpio', text: `D13 → ${statusLed(state) ? 'HIGH' : 'LOW'} · on-board L LED ${statusLed(state) ? 'on' : 'off'}` });
  }
  return { state, events };
}

function gpioEvent(at: number, pin: number, duty: number, name: string, by: 'manual' | 'rule'): DeviceEvent {
  const led = LEDS.find((l) => l.pin === pin)!;
  const d = describeDuty(duty);
  const level = d.mode === 'PWM' ? `PWM ${duty}/255 (${d.percent}%)` : d.mode;
  const ma = duty > 0 ? ` · ${ledCurrentMa(led, duty).toFixed(1)} mA` : '';
  return { at, kind: 'gpio', text: `D${pin} → ${level} · ${name} ${duty > 0 ? 'on' : 'off'}${ma} · ${codeFor(pin, duty)}${by === 'rule' ? ' (rule)' : ''}`, key: by === 'manual' ? `gpio:${pin}` : undefined };
}

export function bootEvents(at: number): DeviceEvent[] {
  return [
    { at, kind: 'sys', text: 'Boot · KL-UNO virtual board · 5 V · 16 MHz · firmware lab-rules v1 (simulated)' },
    { at, kind: 'sys', text: 'pinMode D9, D10, D11, D13 → OUTPUT · A0 TMP36 · A1 photoresistor' },
  ];
}

export function apply(prev: DeviceState, cmd: Command, at: number): Result {
  switch (cmd.op) {
    case 'reset':
      return { state: initialState(), events: [] };

    case 'output': {
      const led = LEDS.find((l) => l.pin === cmd.pin);
      if (!led) return { state: prev, events: [{ at, kind: 'warn', text: `D${cmd.pin} is not connected to anything` }] };
      const owner = ownerOf(prev, led.pin);
      if (owner) return { state: prev, events: [{ at, kind: 'warn', text: `D${led.pin} is driven by the "${owner.name}" rule. Manual write ignored; disable the rule to take control.` }] };
      const cur = prev.outputs[led.id];
      const out = { on: cmd.on ?? cur.on, duty: cmd.duty === undefined ? cur.duty : Math.round(clamp(cmd.duty, 0, 255)) };
      const next = { ...prev, outputs: { ...prev.outputs, [led.id]: out } };
      const before = pinDuty(prev, led), after = pinDuty(next, led);
      const events = before === after ? [] : [gpioEvent(at, led.pin, after, led.name, 'manual')];
      // A brightness change while the LED is switched off changes nothing on the pin: say so instead of staying silent.
      if (before === after && cmd.duty !== undefined && !out.on) events.push({ at, kind: 'gpio', text: `${led.name} brightness preset to ${out.duty}/255 · D${led.pin} stays LOW until switched on`, key: `gpio:${led.pin}` });
      return { state: next, events };
    }

    case 'rule': {
      const spec = RULES.find((r) => r.id === cmd.id)!;
      const cur = prev.rules[cmd.id];
      const rule = { ...cur, enabled: cmd.enabled ?? cur.enabled, threshold: cmd.threshold === undefined ? cur.threshold : clamp(cmd.threshold, spec.min, spec.max) };
      // A rule that was just switched off releases its pin: back to manual control.
      if (!rule.enabled) rule.active = false;
      const next = { ...prev, rules: { ...prev.rules, [cmd.id]: rule } };
      const events: DeviceEvent[] = [];
      if (rule.enabled !== cur.enabled) events.push({ at, kind: 'rule', text: `${spec.name} rule ${rule.enabled ? 'enabled' : 'disabled'}${rule.enabled ? ` · watching ${spec.input}` : ` · D${spec.output} released to manual control`}` });
      if (rule.threshold !== cur.threshold) events.push({ at, kind: 'rule', text: `${spec.name} threshold → ${spec.unit === 'lux' ? fmtLux(rule.threshold) : fmtC(rule.threshold)}`, key: `rule-th:${spec.id}` });
      const fw = runFirmware(prev, next, at);
      // If a rule released a pin, log the pin going back to its manual value.
      for (const led of LEDS) {
        if (led.pin === spec.output && !rule.enabled && cur.enabled && pinDuty(prev, led) !== pinDuty(fw.state, led)) {
          fw.events.push(gpioEvent(at, led.pin, pinDuty(fw.state, led), led.name, 'manual'));
        }
      }
      return { state: fw.state, events: [...events, ...fw.events] };
    }

    case 'sim.env': {
      const env = {
        tempC: cmd.tempC === undefined ? prev.env.tempC : clamp(cmd.tempC, ENV_LIMITS.tempC.min, ENV_LIMITS.tempC.max),
        lux: cmd.lux === undefined ? prev.env.lux : clamp(cmd.lux, ENV_LIMITS.lux.min, ENV_LIMITS.lux.max),
      };
      const next = { ...prev, env };
      const r = readSensors(env);
      const events: DeviceEvent[] = [];
      if (env.tempC !== prev.env.tempC) events.push({ at, kind: 'sensor', text: `A0 TMP36 · environment ${fmtC(env.tempC)} → reads ${fmtC(r.temp.c)} (ADC ${r.temp.adc}, ${r.temp.volts.toFixed(3)} V)`, key: 'env:temp' });
      if (env.lux !== prev.env.lux) events.push({ at, kind: 'sensor', text: `A1 photoresistor · environment ${fmtLux(env.lux)} → reads ${fmtLux(r.light.lux)} (ADC ${r.light.adc}, ${r.light.volts.toFixed(2)} V)`, key: 'env:light' });
      const fw = runFirmware(prev, next, at);
      return { state: fw.state, events: [...events, ...fw.events] };
    }
  }
}

/** Boot = defaults, then one firmware pass so rules start in the right state. */
export function boot(at: number): Result {
  const s = initialState();
  const fw = runFirmware(s, s, at);
  return { state: fw.state, events: [...bootEvents(at), ...fw.events] };
}
