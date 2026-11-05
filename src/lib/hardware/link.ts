// DeviceLink: the only thing the interface talks to.
//
// The React components never compute physics or rules. They send `Command`s
// and render the `Snapshot`s that come back. Today the link is a simulator
// running in the page. Later, the same interface can be implemented by:
//   - a WebSocket link to an ESP32 or Raspberry Pi (JSON commands/snapshots),
//   - a Web Serial link to an Arduino over USB,
//   - an HTTP link to a Cloudflare Worker that relays to a device.
// Swapping the link is the whole migration; the interface stays the same.
import { apply, boot, type Command, type DeviceEvent } from './device';
import { derive, type DeviceState, type Snapshot } from './model';

export type Transport = 'simulated' | 'websocket' | 'web-serial' | 'http';

export interface DeviceLink {
  readonly transport: Transport;
  readonly label: string;
  /** Current state, read synchronously (for the first render and periodic sampling). */
  snapshot(): Snapshot;
  send(cmd: Command): void;
  /** Called with every new snapshot and the events that produced it. Returns an unsubscribe function. */
  subscribe(listener: (snap: Snapshot, events: DeviceEvent[]) => void): () => void;
}

export function createSimulatedLink(now: () => number = () => performance.now()): DeviceLink {
  let bootedAt = now();
  let bootCount = 0;
  let { state, events: bootLog } = boot(0);
  const listeners = new Set<(snap: Snapshot, events: DeviceEvent[]) => void>();
  const millis = () => Math.max(0, Math.round(now() - bootedAt));
  const snap = (s: DeviceState = state) => derive(s, millis(), bootCount);

  return {
    transport: 'simulated',
    label: 'KL-UNO virtual board',
    snapshot: () => snap(),
    send(cmd) {
      if (cmd.op === 'reset') {
        bootedAt = now();
        bootCount++;
        ({ state, events: bootLog } = boot(0));
        const events: DeviceEvent[] = [{ at: 0, kind: 'sys', text: 'Reset · all outputs LOW, defaults restored, history cleared' }, ...bootLog];
        listeners.forEach((l) => l(snap(), events));
        return;
      }
      const res = apply(state, cmd, millis());
      state = res.state;
      listeners.forEach((l) => l(snap(), res.events));
    },
    subscribe(listener) {
      listeners.add(listener);
      // Replay the boot log so a new subscriber sees how the board started.
      listener(snap(), bootLog);
      return () => { listeners.delete(listener); };
    },
  };
}
