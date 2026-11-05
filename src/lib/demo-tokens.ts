import type { CSSProperties } from 'react';

// Color tokens for the Lab demos.
//
// Each token reads an optional `--d-*` CSS variable and falls back to the value
// the demo used before. Pages that don't define `--d-*` (home, engineering)
// render exactly as they always have; /lab defines them per theme in lab.css.
const v = (name: string, fallback: string) => `var(--d-${name}, ${fallback})`;

export const T = {
  fg: v('fg', 'var(--ink)'),
  fg2: v('fg-2', 'var(--ink-2)'),
  muted: v('muted', 'var(--muted)'),
  line: v('line', 'var(--line)'),
  line2: v('line-2', 'var(--line-2)'),
  card: v('card', '#fff'),
  subtle: v('subtle', 'var(--paper)'),
  accent: v('accent', 'var(--accent)'),
  onAccent: v('on-accent', 'var(--ink)'),
  selBg: v('sel-bg', 'var(--ink)'),
  selFg: v('sel-fg', 'var(--paper)'),
  error: v('error', '#B4361A'),
  ok: v('ok', '#1F7A4C'),
  offBg: v('off-bg', '#EFEDE8'),
  offFg: v('off-fg', '#8A8A90'),
  bar: v('bar', '#C9C5BD'),
  owned: v('owned', '#DCE2E8'),
  managed: v('managed', '#E6E0F0'),
} as const;

// Border as per-side longhands. `border` and `border-color` are both shorthands;
// when they contain var(), the browser stores them in a form React can't match
// against its server output, which logs a hydration warning. Per-side longhands
// round-trip cleanly.
type Side = 'Top' | 'Right' | 'Bottom' | 'Left';
const ALL: Side[] = ['Top', 'Right', 'Bottom', 'Left'];
export const bd = (color: string, width = 1, style: 'solid' | 'dashed' = 'solid', side?: Side): CSSProperties =>
  Object.fromEntries((side ? [side] : ALL).flatMap((s) => [[`border${s}Width`, width], [`border${s}Style`, style], [`border${s}Color`, color]]));
