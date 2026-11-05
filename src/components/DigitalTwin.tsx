import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Avatar, { type Activity } from './Avatar';
import { answerFromKnowledge, MAX_QUESTION, type Source } from '../lib/twin-answer';

/* ------------------------------------------------------------------ *
 * Digital Dawood
 *
 * USER ACTIVITY → CONTEXT DETECTION → BEHAVIOR DECISION → STATE MACHINE
 * → ANIMATION → (optional) AI RESPONSE
 *
 * Everything routine (walking, sitting, idling, reacting) is decided
 * locally. Only visitor questions go to /api/ask, which answers from
 * src/data/knowledge.ts (and, only if an AI key is configured, lets Claude
 * phrase the answer). If /api/ask can't be reached, the same knowledge-based
 * answer is built right here in the browser. Nothing about the visitor is
 * stored or sent except the question and the page/section they are on.
 * ------------------------------------------------------------------ */

type Note = { text: string; kind: 'thought' | 'statement' };
type Mode = 'home' | 'travel' | 'perched';
type Msg = { from: 'me' | 'you'; text: string; show?: { href: string; label: string } | null; source?: Source };

const SOURCE_LABEL: Record<Source, string> = {
  knowledge: 'From Dawood’s approved notes · not AI',
  ai: 'AI-phrased · grounded in Dawood’s notes',
};

const SIZE = 78;                     // rendered width in px
const H = SIZE * 1.967;              // rendered height
const HIP = 0.805;                   // hip line as a fraction of height
const PREFS = 'kads-twin';
const SURPRISES = 'kads-twin-surprises';

const QUIPS: Partial<Record<Activity, string>> = {
  typing: 'Pushing a fix. This site deploys itself on every commit.',
  read: 'Reading the docs, like a responsible engineer.',
  coffee: 'Refueling. Back to shipping in a second.',
  juggle: 'Knowledge, Architecture, Development, Systems. Keeping all four in the air.',
  wrench: 'Old habit from my embedded days: if it’s broken, open it up.',
  think: 'This section is more interesting than it looks.',
  point: 'There’s a clever integration behind this one. Ask me about it.',
  sit: 'Nice view from up here.',
  idle: 'Ask me anything about Dawood’s work. I only answer from what’s real.',
  sleep: 'Zzz… oh! You’re back.',
};

const HOME_ACTS: [Activity, number][] = [['typing', 3], ['coffee', 2], ['juggle', 1], ['phone', 1], ['stretch', 1], ['think', 1], ['idle', 2]];
const PERCH_ACTS: Record<string, [Activity, number][]> = {
  default: [['sit', 4], ['read', 2], ['coffee', 2], ['think', 1]],
  inspect: [['point', 4], ['think', 3], ['sit', 2]],
  terminal: [['typing', 5], ['think', 1]],
  engineering: [['wrench', 4], ['think', 2]],
};

const pick = (list: [Activity, number][]): Activity => {
  const total = list.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [a, w] of list) if ((r -= w) <= 0) return a;
  return list[0]![0];
};

export default function DigitalTwin() {
  const [hidden, setHidden] = useState(false);
  const [paused, setPaused] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [still, setStill] = useState(false);
  const [mode, setMode] = useState<Mode>('home');
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [face, setFace] = useState<1 | -1>(1);
  const [hop, setHop] = useState(0);
  const [activity, setActivity] = useState<Activity>('wave');
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [note, setNote] = useState<Note | null>(null);
  const [unread, setUnread] = useState(false);
  const [bubble, setBubble] = useState(false);
  const [chat, setChat] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [bug, setBug] = useState<{ x: number; y: number } | null>(null);
  const [toast, setToast] = useState('');

  const perch = useRef<HTMLElement | null>(null);
  const section = useRef<HTMLElement | null>(null);
  const sectionSince = useRef(Date.now());
  const seen = useRef(new WeakSet<Element>());
  const lastInput = useRef(Date.now());
  const busyUntil = useRef(0);
  const nextMove = useRef(Date.now() + 5000);
  const started = useRef(Date.now());
  const box = useRef<HTMLDivElement>(null);
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }); }, [msgs, busy]);
  const modeRef = useRef<Mode>('home');
  modeRef.current = mode;

  const act = useCallback((a: Activity, ms: number) => { setActivity(a); busyUntil.current = Date.now() + ms; }, []);

  const homeSpot = useCallback(() => ({ x: innerWidth - SIZE - (innerWidth < 760 ? 10 : 28), y: innerHeight - H - 6 }), []);

  const perchSpot = (el: HTMLElement, side: 'left' | 'right' = el.dataset.perchSide === 'left' ? 'left' : 'right') => {
    const r = el.getBoundingClientRect();
    const x = Math.min(innerWidth - SIZE - 8, Math.max(8, side === 'right' ? r.right - SIZE - 18 : r.left + 18));
    return { x, y: r.top - H * HIP + 4 };
  };

  // Collision check: the space he'd occupy above the perch must be free of
  // links, buttons, headings, text and images. Otherwise he doesn't go there.
  const BLOCKERS = 'a,button,input,textarea,select,label,h1,h2,h3,h4,p,li,img,figcaption,.eyebrow';
  const blocked = (s: { x: number; y: number }) => {
    if (s.y < 90) return true;                       // under the sticky header
    for (const fx of [0.15, 0.5, 0.85]) for (const fy of [0.08, 0.4, 0.72]) {
      const hits = document.elementsFromPoint(s.x + SIZE * fx, s.y + H * HIP * fy);
      if (hits.some((h) => !h.closest('.twin') && h.matches(BLOCKERS))) return true;
    }
    return false;
  };
  const freeSpot = (el: HTMLElement) => {
    for (const side of ['right', 'left'] as const) { const s = perchSpot(el, side); if (!blocked(s)) return { s, side }; }
    return null;
  };

  const travel = useCallback((to: { x: number; y: number }, target: HTMLElement | null) => {
    setPos((from) => {
      const dx = to.x - from.x, dy = to.y - from.y;
      setFace(dx < 0 ? -1 : 1);
      const jumping = Math.abs(dy) > 40;
      const ms = jumping ? 750 : Math.min(2600, Math.max(500, Math.abs(dx) * 5));
      if (jumping) setHop((h) => h + 1);
      setActivity(jumping ? 'stretch' : 'walk');
      setMode('travel');
      perch.current = target;
      busyUntil.current = Date.now() + ms;
      if (box.current) box.current.style.transition = `left ${ms}ms ${jumping ? 'cubic-bezier(.3,.7,.4,1)' : 'linear'}, top ${ms}ms cubic-bezier(.3,.7,.4,1)`;
      setTimeout(() => {
        if (box.current) box.current.style.transition = 'none';
        setMode(target ? 'perched' : 'home');
        setActivity(target ? pick(PERCH_ACTS[target.dataset.perchMood || 'default'] ?? PERCH_ACTS.default!) : 'idle');
        busyUntil.current = Date.now() + 4000;
      }, ms + 20);
      return to;
    });
  }, []);

  /* ---------- setup: preferences, environment ---------- */
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS) || '{}');
      setHidden(!!p.hidden); setPaused(!!p.paused);
    } catch { /* no storage */ }
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    setStill(mq.matches);
    const onResize = () => { setMobile(innerWidth < 760); if (modeRef.current === 'home') setPos(homeSpot()); };
    onResize();
    addEventListener('resize', onResize);
    return () => removeEventListener('resize', onResize);
  }, [homeSpot]);

  const save = (p: { hidden?: boolean; paused?: boolean }) => {
    try { localStorage.setItem(PREFS, JSON.stringify({ hidden, paused, ...p })); } catch { /* ignore */ }
  };

  /* ---------- context: sections with notes ---------- */
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-guide]'));
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting || e.target === section.current) continue;
        const el = e.target as HTMLElement;
        section.current = el; sectionSince.current = Date.now();
        setNote({ text: el.dataset.guide || '', kind: el.dataset.guideKind === 'thought' ? 'thought' : 'statement' });
        setUnread(!seen.current.has(el));
        setBubble(false);
      }
    }, { rootMargin: '-45% 0px -45% 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* ---------- keep perched position glued to its element ---------- */
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (modeRef.current === 'perched' && perch.current) {
        const r = perch.current.getBoundingClientRect();
        if (r.top - H * HIP < 86 || r.top > innerHeight - 60) { travel(homeSpot(), null); }
        else setPos(perchSpot(perch.current, perch.current.dataset.perchAt === 'left' ? 'left' : 'right'));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [travel, homeSpot]);

  /* ---------- behavior decision loop ---------- */
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      if (now - lastInput.current > 15000) { if (activity !== 'sleep') act('sleep', 1e9); return; }
      if (now < busyUntil.current || chat) return;

      // Dwell: visitor lingering on a technical section.
      const sec = section.current;
      if (sec?.dataset.guideDwell && now - sectionSince.current > 12000 && !seen.current.has(sec)) {
        setNote({ text: sec.dataset.guideDwell, kind: 'thought' });
        setUnread(true);
        sec.dataset.guideDwell = '';
      }

      // Occasional surprises, at most two per visit.
      let done: string[] = [];
      try { done = JSON.parse(sessionStorage.getItem(SURPRISES) || '[]'); } catch { /* ignore */ }
      if (!mobile && !still && !paused && done.length < 2 && modeRef.current === 'home') {
        if (!done.includes('bug') && now - started.current > 40000 && Math.random() < 0.08) {
          const home = homeSpot();
          setBug({ x: Math.max(40, home.x - 260), y: innerHeight - 22 });
          travel({ x: Math.max(8, home.x - 280), y: home.y }, null);
          setTimeout(() => { setBug(null); act('typing', 2500); setToast('Bug fixed'); setTimeout(() => setToast(''), 2200); }, 2400);
          try { sessionStorage.setItem(SURPRISES, JSON.stringify([...done, 'bug'])); } catch { /* ignore */ }
          return;
        }
        if (!done.includes('deploy') && now - started.current > 70000 && Math.random() < 0.08) {
          act('typing', 3000);
          setTimeout(() => { setToast('Deployed to production'); setTimeout(() => setToast(''), 2200); }, 2600);
          try { sessionStorage.setItem(SURPRISES, JSON.stringify([...done, 'deploy'])); } catch { /* ignore */ }
          return;
        }
      }

      // Movement: hop onto a visible perch now and then (desktop only).
      if (!mobile && !still && !paused && now > nextMove.current) {
        nextMove.current = now + 9000 + Math.random() * 9000;
        const perches = Array.from(document.querySelectorAll<HTMLElement>('[data-perch]')).filter((el) => {
          const r = el.getBoundingClientRect();
          return r.top > 140 && r.top < innerHeight - 200 && r.width > 200;
        });
        if (modeRef.current === 'perched' && Math.random() < 0.4) { travel(homeSpot(), null); return; }
        if (perches.length && Math.random() < 0.7) {
          const target = perches[Math.floor(Math.random() * perches.length)]!;
          const free = target !== perch.current ? freeSpot(target) : null;
          if (free) { target.dataset.perchAt = free.side; travel(free.s, target); return; }
        }
      }

      // Otherwise pick something to do where he is.
      const list = modeRef.current === 'perched' && perch.current
        ? PERCH_ACTS[perch.current.dataset.perchMood || 'default'] ?? PERCH_ACTS.default!
        : HOME_ACTS;
      act(pick(list), 5000 + Math.random() * 4000);
    }, 1000);
    return () => clearInterval(t);
  }, [act, activity, chat, mobile, still, paused, travel, homeSpot]);

  /* ---------- visitor input: wake, eyes, fast scroll ---------- */
  useEffect(() => {
    let lastY = scrollY, lastT = performance.now(), raf = 0;
    const wake = () => { const slept = Date.now() - lastInput.current > 15000; lastInput.current = Date.now(); if (slept) act('surprised', 1400); };
    const onMove = (e: PointerEvent) => {
      wake();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = box.current?.getBoundingClientRect(); if (!r) return;
        const dx = (e.clientX - (r.left + r.width / 2)) * face, dy = e.clientY - (r.top + r.height * 0.3);
        const d = Math.hypot(dx, dy) || 1;
        setLook({ x: (dx / d) * Math.min(1.6, d / 60), y: (dy / d) * Math.min(1.6, d / 60) });
      });
    };
    const onScroll = () => {
      wake();
      const now = performance.now(), v = Math.abs(scrollY - lastY) / Math.max(16, now - lastT);
      lastY = scrollY; lastT = now;
      if (v > 4 && modeRef.current !== 'travel' && Date.now() > busyUntil.current - 4000) act('surprised', 1200);
    };
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('keydown', wake);
    return () => { removeEventListener('pointermove', onMove); removeEventListener('scroll', onScroll); removeEventListener('keydown', wake); cancelAnimationFrame(raf); };
  }, [act, face]);

  /* ---------- conversation ---------- */
  const openBubble = () => {
    setBubble(true);
    if (unread && section.current) seen.current.add(section.current);
    setUnread(false);
    lastInput.current = Date.now();
    if (activity === 'sleep') act('surprised', 1400);
  };

  const openChat = () => {
    setChat(true); setBubble(false);
    if (!msgs.length) setMsgs([{ from: 'me', text: 'Hey! I’m Digital Dawood. Ask me about my work, my stack, or how something on this site was built. I only answer from what’s real.' }]);
    act('talk', 2500);
  };

  const ask = async (q: string) => {
    if (!q.trim() || busy) return;
    setMsgs((m) => [...m, { from: 'you', text: q }]);
    setBusy(true); act('think', 60000);
    const secLabel = section.current?.dataset.guide || '';
    let reply: Msg;
    try {
      const res = await fetch('/api/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q: q.slice(0, MAX_QUESTION), page: location.pathname, section: secLabel }), signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json() as { answer?: unknown; show?: Msg['show']; source?: unknown };
      if (typeof data.answer !== 'string' || !data.answer.trim()) throw new Error('empty');
      const show = data.show && typeof data.show.href === 'string' && data.show.href.startsWith('/') ? data.show : null;
      reply = { from: 'me', text: data.answer, show, source: data.source === 'ai' ? 'ai' : 'knowledge' };
    } catch {
      // The endpoint is unreachable (offline, local dev, rate-limited):
      // build the same knowledge-based answer in the browser.
      const local = answerFromKnowledge(q, location.pathname);
      reply = { from: 'me', text: local.answer, show: local.show, source: local.source };
    }
    setMsgs((m) => [...m, reply]);
    setBusy(false); act('talk', 2400);
  };

  const suggestions = (() => {
    const p = typeof location !== 'undefined' ? location.pathname : '/';
    if (p.startsWith('/work')) return ['What was your role on these?', 'Why no client names?', 'How did you integrate the CRM?'];
    if (p.startsWith('/lab')) return ['How does the lead routing work?', 'What does the hardware lab simulate?', 'What stack is the Lab built with?'];
    if (p.startsWith('/engineering')) return ['How do you work?', 'Tell me about the motor project', 'How does Digital Dawood work?'];
    return ['What do you actually do?', 'How did you integrate the CRM?', 'Are you open to roles?'];
  })();

  /* ---------- controls ---------- */
  const togglePause = () => { const v = !paused; setPaused(v); save({ paused: v }); if (v) travel(homeSpot(), null); };
  const hide = () => { setHidden(true); setChat(false); setBubble(false); save({ hidden: true }); };
  const reset = () => {
    try { localStorage.removeItem(PREFS); sessionStorage.removeItem(SURPRISES); } catch { /* ignore */ }
    seen.current = new WeakSet(); setMsgs([]); setPaused(false); setHidden(false); setChat(false);
    travel(homeSpot(), null); act('wave', 2000);
  };

  if (hidden) return <button type="button" className="guide-restore" onClick={() => { setHidden(false); save({ hidden: false }); }}>Show Digital Dawood</button>;

  const text = unread && note ? note.text : QUIPS[activity] ?? note?.text ?? QUIPS.idle!;
  const kind = unread && note ? note.kind : 'thought';
  const flip = face === -1 && (mode === 'travel' || activity === 'walk');

  return (
    <>
      {bug && <span className="twin-bug" style={{ left: bug.x, top: bug.y }} aria-hidden="true" />}
      {toast && <div className="twin-toast" role="status">✓ {toast}</div>}

      <div ref={box} className={`twin mode-${mode}${pos.x < 320 ? ' twin-left' : ''}`} style={{ left: pos.x, top: pos.y, width: SIZE }} onMouseLeave={() => setBubble(false)}>
        {bubble && !chat && (
          <div className={`guide-bubble ${kind} twin-bubble`} role="status">
            <p>{text}</p>
            <div className="twin-actions">
              <button type="button" onClick={openChat}>Ask me something</button>
              <button type="button" onClick={togglePause}>{paused ? 'Let me roam' : 'Stay put'}</button>
              <button type="button" onClick={hide}>Hide</button>
            </div>
          </div>
        )}
        {!bubble && !chat && unread && note && (
          <span className={`guide-signal ${note.kind}`} aria-hidden="true">{note.kind === 'thought' ? <><i /><i /><i /></> : '!'}</span>
        )}
        <button
          key={hop}
          type="button"
          className={`twin-btn${mode === 'travel' && hop ? ' hopping' : ''}`}
          aria-label={unread ? `Digital Dawood has a ${note?.kind} for you` : 'Digital Dawood'}
          aria-expanded={bubble || chat}
          onMouseEnter={openBubble}
          onFocus={openBubble}
          onClick={() => (chat ? setChat(false) : openChat())}
          style={{ transform: flip ? 'scaleX(-1)' : undefined }}
        >
          <Avatar size={SIZE} variant="soft" activity={activity} look={activity === 'sleep' ? { x: 0, y: 0 } : look} />
        </button>
      </div>

      {chat && (
        <section className="twin-chat" aria-label="Chat with Digital Dawood">
          <header>
            <div><strong>Digital Dawood</strong><span>Answers from Dawood’s approved notes · AI only when enabled</span></div>
            <button type="button" onClick={() => setChat(false)} aria-label="Close chat">×</button>
          </header>
          <div ref={log} className="twin-log" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={`twin-msg ${m.from}`}>
                <p>{m.text}</p>
                {m.show && <a href={m.show.href}>Show me: {m.show.label} →</a>}
                {m.source && <small className="twin-src">{SOURCE_LABEL[m.source]}</small>}
              </div>
            ))}
            {busy && <div className="twin-msg me typing"><i /><i /><i /></div>}
          </div>
          <div className="twin-sugg">{suggestions.map((s) => <button key={s} type="button" onClick={() => ask(s)}>{s}</button>)}</div>
          <form onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = e.currentTarget; const v = (f.elements.namedItem('q') as HTMLInputElement).value; f.reset(); void ask(v); }}>
            <label className="sr-only" htmlFor="twin-q">Ask Digital Dawood</label>
            <input id="twin-q" name="q" maxLength={MAX_QUESTION} placeholder="Ask about my work, stack, or this site…" autoComplete="off" />
            <button type="submit" disabled={busy}>Send</button>
          </form>
          <footer>
            <button type="button" onClick={togglePause}>{paused ? 'Resume movement' : 'Pause movement'}</button>
            <button type="button" onClick={hide}>Hide character</button>
            <button type="button" onClick={reset}>Reset</button>
            <span>No audio · No tracking</span>
          </footer>
        </section>
      )}
    </>
  );
}
