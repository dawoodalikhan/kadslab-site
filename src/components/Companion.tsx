import { useCallback, useEffect, useRef, useState } from 'react';
import Avatar, { type Activity } from './Avatar';

type Note = { text: string; kind: 'thought' | 'statement' };
const STORAGE_KEY = 'kads-guide-hidden';

// What he says while busy with each activity (shown when you hover him
// and there is no unread section note).
const QUIPS: Partial<Record<Activity, string>> = {
  typing: 'Pushing a fix. This site deploys itself on every commit.',
  coffee: 'Refueling. Back to shipping in a second.',
  juggle: 'Knowledge, Architecture, Development, Systems. Keeping all four in the air.',
  wrench: 'Old habit from my embedded days: if it’s broken, open it up.',
  phone: 'Checking that this page still looks right on a phone.',
  sleep: 'Zzz… oh! You’re back. Scroll on, I’ll keep up.',
  stretch: 'Long build. Quick stretch.',
  peek: 'Just checking you found the Lab yet.',
  surprised: 'Whoa, speed-reader! Slow down, the good stuff is below.',
  idle: 'I’m a behavior-driven brand character. Want one for your site?',
  wave: 'Hi! Hover me any time I signal.',
};

// Activity weights per section type (data-guide-mood on sections).
const MOODS: Record<string, [Activity, number][]> = {
  default: [['typing', 3], ['coffee', 2], ['juggle', 2], ['phone', 2], ['stretch', 1], ['peek', 1], ['idle', 2]],
  build: [['typing', 5], ['coffee', 2], ['phone', 1], ['idle', 1]],
  engineering: [['wrench', 5], ['typing', 2], ['coffee', 1]],
  brand: [['juggle', 5], ['typing', 1], ['idle', 1]],
  contact: [['wave', 3], ['phone', 2], ['coffee', 1]],
};

function pick(mood: string): Activity {
  const list = MOODS[mood] ?? MOODS.default!;
  const total = list.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [a, w] of list) { if ((r -= w) <= 0) return a; }
  return 'idle';
}

// A small behavior engine: he picks activities based on the section in
// view, reacts to fast scrolling, falls asleep when the visitor goes
// quiet, follows the cursor with his eyes, and signals when a section has
// a note for you. Notes are pre-written by Dawood (data-guide attributes).
export default function Companion() {
  const [note, setNote] = useState<Note | null>(null);
  const [unread, setUnread] = useState(false);
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<'right' | 'left'>('right');
  const [hop, setHop] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [activity, setActivity] = useState<Activity>('wave');
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [still, setStill] = useState(false);
  const current = useRef<HTMLElement | null>(null);
  const seen = useRef(new WeakSet<Element>());
  const mood = useRef('default');
  const lastInput = useRef(Date.now());
  const busyUntil = useRef(0);
  const box = useRef<HTMLDivElement>(null);

  const doActivity = useCallback((a: Activity, ms: number) => {
    setActivity(a);
    busyUntil.current = Date.now() + ms;
  }, []);

  // Section notes + hopping
  useEffect(() => {
    try { setHidden(localStorage.getItem(STORAGE_KEY) === '1'); } catch { /* storage unavailable */ }
    setStill(matchMedia('(prefers-reduced-motion: reduce)').matches);
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-guide]'));
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting || e.target === current.current) continue;
        const el = e.target as HTMLElement;
        current.current = el;
        mood.current = el.dataset.guideMood || 'default';
        setNote({ text: el.dataset.guide || '', kind: el.dataset.guideKind === 'thought' ? 'thought' : 'statement' });
        setUnread(!seen.current.has(el));
        setOpen(false);
        setSide((s) => (window.innerWidth < 760 ? 'right' : s === 'right' ? 'left' : 'right'));
        setHop((h) => h + 1);
        doActivity('wave', 2200);
      }
    }, { rootMargin: '-45% 0px -45% 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [doActivity]);

  // Behavior loop: idle → sleep, otherwise a new activity every few seconds.
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      if (now - lastInput.current > 14000) { setActivity('sleep'); busyUntil.current = now + 1e9; return; }
      if (now < busyUntil.current) return;
      const a = pick(mood.current);
      doActivity(a, a === 'peek' ? 3500 : 5000 + Math.random() * 3000);
    }, 1000);
    return () => clearInterval(t);
  }, [doActivity]);

  // Input: wake up, eyes follow the cursor, surprise on fast scrolling.
  useEffect(() => {
    let lastY = scrollY, lastT = performance.now(), raf = 0;
    const wake = () => {
      const wasAsleep = Date.now() - lastInput.current > 14000;
      lastInput.current = Date.now();
      if (wasAsleep) doActivity('surprised', 1400);
    };
    const onMove = (e: PointerEvent) => {
      wake();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = box.current?.getBoundingClientRect();
        if (!r) return;
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height * 0.35);
        const d = Math.hypot(dx, dy) || 1;
        setLook({ x: (dx / d) * Math.min(1.6, d / 60), y: (dy / d) * Math.min(1.6, d / 60) });
      });
    };
    const onScroll = () => {
      wake();
      const now = performance.now();
      const v = Math.abs(scrollY - lastY) / Math.max(16, now - lastT);
      lastY = scrollY; lastT = now;
      if (v > 4 && Date.now() > busyUntil.current - 4000) doActivity('surprised', 1200);
    };
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('keydown', wake);
    return () => { removeEventListener('pointermove', onMove); removeEventListener('scroll', onScroll); removeEventListener('keydown', wake); cancelAnimationFrame(raf); };
  }, [doActivity]);

  const read = () => {
    setOpen(true);
    if (unread && current.current) seen.current.add(current.current);
    setUnread(false);
    lastInput.current = Date.now();
    if (activity === 'sleep') doActivity('surprised', 1400);
  };
  const hide = () => { setHidden(true); setOpen(false); try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ } };
  const show = () => { setHidden(false); try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ } };

  if (hidden) return <button type="button" className="guide-restore" onClick={show}>Show guide</button>;
  if (!note) return null;

  const text = unread || !QUIPS[activity] ? note.text : QUIPS[activity]!;
  const kind = unread ? note.kind : 'thought';

  return (
    <div ref={box} className={`guide guide-${side}${activity === 'peek' && !open ? ' peek' : ''}`} onMouseLeave={() => setOpen(false)}>
      {open && (
        <div className={`guide-bubble ${kind}`} role="status">
          <p>{text}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 10 }}>
            {!unread && activity === 'idle' ? <a href="/contact/" className="guide-link">Talk about a mascot →</a> : <span />}
            <button type="button" className="guide-hide" onClick={hide}>Hide guide</button>
          </div>
        </div>
      )}
      {!open && unread && (
        <span className={`guide-signal ${note.kind}`} aria-hidden="true">{note.kind === 'thought' ? <><i /><i /><i /></> : '!'}</span>
      )}
      <button
        key={hop}
        type="button"
        className={`guide-btn${still ? ' still' : ''}`}
        aria-label={unread ? `Dawood has a ${note.kind} for you` : 'Dawood’s guide'}
        aria-expanded={open}
        onMouseEnter={read}
        onFocus={read}
        onClick={() => (open ? setOpen(false) : read())}
      >
        <Avatar size={112} activity={activity} look={activity === 'sleep' ? { x: 0, y: 0 } : look} />
      </button>
    </div>
  );
}
