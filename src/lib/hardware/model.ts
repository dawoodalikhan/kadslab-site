// Virtual hardware lab: the circuit and the physics.
// Pure TypeScript, no React and no DOM, so it can be unit-tested, run in a
// Worker, or swapped for readings from a real board later.
//
// The circuit (5 V, Uno-style microcontroller, 10-bit ADC):
//   D9  ~PWM → 220 Ω → cyan LED   → GND
//   D10 ~PWM → 220 Ω → violet LED → GND
//   D11 ~PWM → 220 Ω → orange LED → GND   (the night-light rule can drive it)
//   D13      → on-board "L" LED            (the over-temperature rule drives it)
//   A0 ← TMP36 temperature sensor (Vout = 0.5 V + 10 mV/°C)
//   A1 ← photoresistor (LDR) from 5 V, with a 10 kΩ resistor to GND

export const VCC = 5;
export const ADC_MAX = 1023;
export const LED_RESISTOR = 220;
export const DIVIDER_RESISTOR = 10_000;
/** Typical current of the board itself (regulator, MCU, power LED), in mA. */
export const BOARD_IDLE_MA = 46;

export type LedId = 'cyan' | 'violet' | 'orange';
export type PwmPin = 9 | 10 | 11;
export type RuleId = 'night-light' | 'overheat';

export type LedSpec = { id: LedId; pin: PwmPin; name: string; vf: number };
export const LEDS: readonly LedSpec[] = [
  { id: 'cyan', pin: 9, name: 'Cyan LED', vf: 3.0 },
  { id: 'violet', pin: 10, name: 'Violet LED', vf: 3.2 },
  { id: 'orange', pin: 11, name: 'Orange LED', vf: 2.0 },
];
export const STATUS_PIN = 13;

export type RuleSpec = { id: RuleId; name: string; input: 'A0' | 'A1'; output: number; unit: string; min: number; max: number; step: number };
export const RULES: readonly RuleSpec[] = [
  { id: 'night-light', name: 'Night light', input: 'A1', output: 11, unit: 'lux', min: 5, max: 400, step: 5 },
  { id: 'overheat', name: 'Over-temperature alert', input: 'A0', output: STATUS_PIN, unit: '°C', min: 20, max: 45, step: 0.5 },
];

export type Output = { on: boolean; duty: number };
export type Rule = { enabled: boolean; threshold: number; active: boolean };

export type DeviceState = {
  /** The simulated world around the board. Only the simulator can change it. */
  env: { tempC: number; lux: number };
  /** What was written to each LED pin (switch + PWM duty 0–255). */
  outputs: Record<LedId, Output>;
  rules: Record<RuleId, Rule>;
};

export const ENV_LIMITS = { tempC: { min: -10, max: 50 }, lux: { min: 1, max: 1000 } } as const;

export function initialState(): DeviceState {
  return {
    env: { tempC: 22, lux: 320 },
    outputs: { cyan: { on: true, duty: 180 }, violet: { on: false, duty: 255 }, orange: { on: false, duty: 255 } },
    rules: {
      'night-light': { enabled: true, threshold: 80, active: false },
      overheat: { enabled: true, threshold: 30, active: false },
    },
  };
}

/* ---------- Sensor physics ---------- */
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const toAdc = (volts: number) => clamp(Math.round((volts / VCC) * ADC_MAX), 0, ADC_MAX);
const toVolts = (adc: number) => (adc * VCC) / ADC_MAX;

/** Photoresistor (GL5528-style): about 15 kΩ at 10 lux, gamma 0.7. */
const ldrOhms = (lux: number) => 15_000 * Math.pow(Math.max(lux, 0.5) / 10, -0.7);

export type Readings = {
  temp: { volts: number; adc: number; c: number };
  light: { volts: number; adc: number; lux: number; ohms: number };
};

/**
 * What the firmware actually sees: the analog voltage, quantized by the
 * 10-bit ADC, then converted back to engineering units. That's why the
 * reading can differ slightly from the simulated environment value.
 */
export function readSensors(env: DeviceState['env']): Readings {
  const tAdc = toAdc(0.5 + env.tempC / 100);
  const ohms = ldrOhms(env.lux);
  const lAdc = toAdc((VCC * DIVIDER_RESISTOR) / (DIVIDER_RESISTOR + ohms));
  const lVolts = toVolts(lAdc);
  const rEst = lAdc <= 0 ? Infinity : DIVIDER_RESISTOR * (VCC / toVolts(Math.min(lAdc, ADC_MAX - 1)) - 1);
  return {
    temp: { volts: toVolts(tAdc), adc: tAdc, c: (toVolts(tAdc) - 0.5) * 100 },
    light: { volts: lVolts, adc: lAdc, ohms, lux: Number.isFinite(rEst) ? 10 * Math.pow(rEst / 15_000, -1 / 0.7) : 0 },
  };
}

/* ---------- Outputs ---------- */
/** The rule that currently owns a pin, if any. Owned pins ignore manual writes. */
export function ownerOf(state: DeviceState, pin: number): RuleSpec | undefined {
  return RULES.find((r) => r.output === pin && state.rules[r.id].enabled);
}

/** The duty cycle actually on the pin (0 = LOW, 255 = HIGH, else PWM). */
export function pinDuty(state: DeviceState, led: LedSpec): number {
  const owner = ownerOf(state, led.pin);
  if (owner) return state.rules[owner.id].active ? 255 : 0;
  const o = state.outputs[led.id];
  return o.on ? o.duty : 0;
}

export const statusLed = (state: DeviceState) => state.rules.overheat.enabled && state.rules.overheat.active;

/** Average LED current under PWM: (Vcc − Vf) / R, scaled by the duty cycle. */
export const ledCurrentMa = (led: LedSpec, duty: number) => ((VCC - led.vf) / LED_RESISTOR) * 1000 * (duty / 255);

export type PinState = { mode: 'LOW' | 'HIGH' | 'PWM'; duty: number; percent: number };
export function describeDuty(duty: number): PinState {
  return { mode: duty <= 0 ? 'LOW' : duty >= 255 ? 'HIGH' : 'PWM', duty, percent: Math.round((duty / 255) * 100) };
}

/** The Arduino-style call that would produce this pin state. */
export function codeFor(pin: number, duty: number): string {
  const d = describeDuty(duty);
  return d.mode === 'PWM' ? `analogWrite(${pin}, ${duty})` : `digitalWrite(${pin}, ${d.mode})`;
}

/** Everything the interface needs, derived once per change. */
export type Snapshot = {
  state: DeviceState;
  readings: Readings;
  duty: Record<LedId, number>;
  statusLed: boolean;
  currentMa: number;
  /** Milliseconds since the (virtual) board booted, like Arduino's millis(). */
  uptime: number;
  /** Increments on every reset, so the interface knows to clear its history. */
  boot: number;
};

export function derive(state: DeviceState, uptime: number, boot: number): Snapshot {
  const duty = Object.fromEntries(LEDS.map((l) => [l.id, pinDuty(state, l)])) as Record<LedId, number>;
  const ledMa = LEDS.reduce((s, l) => s + ledCurrentMa(l, duty[l.id]), 0);
  const status = statusLed(state);
  return {
    state,
    readings: readSensors(state.env),
    duty,
    statusLed: status,
    // The on-board L LED draws about 2 mA through its own resistor.
    currentMa: BOARD_IDLE_MA + ledMa + (status ? 2 : 0),
    uptime,
    boot,
  };
}

export { clamp };
