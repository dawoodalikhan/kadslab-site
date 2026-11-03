import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';

type Note = { text: string; kind: 'thought' | 'statement' };
const STORAGE_KEY = 'kads-guide-hidden';

// A small illustrated guide that hops to the side of the screen when a new
// section comes into view. A thought cloud or "!" means he has something
// to say; hover, focus or click him to read it. Messages are written by
// Dawood and live on each section as data-guide attributes.
export default function Companion() {
  const [note, setNote] = useState<Note | null>(null);
  const [unread, setUnread] = useState(false);
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<'right' | 'left'>('right');
  const [hop, setHop] = useState(0);
  const [hidden, setHidden] = useState(false);
  const current = useRef<Element | null>(null);
  const seen = useRef(new WeakSet<Element>());

  useEffect(() => {
    try { setHidden(localStorage.getItem(STORAGE_KEY) === '1'); } catch { /* storage unavailable */ }
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-guide]'));
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting || e.target === current.current) continue;
        current.current = e.target;
        const el = e.target as HTMLElement;
        setNote({ text: el.dataset.guide || '', kind: el.dataset.guideKind === 'thought' ? 'thought' : 'statement' });
        setUnread(!seen.current.has(el));
        setOpen(false);
        setSide((s) => (window.innerWidth < 760 ? 'right' : s === 'right' ? 'left' : 'right'));
        setHop((h) => h + 1);
      }
    }, { rootMargin: '-45% 0px -45% 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const read = () => {
    setOpen(true);
    setUnread(false);
    if (current.current) seen.current.add(current.current);
  };
  const hide = () => { setHidden(true); setOpen(false); try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ } };
  const show = () => { setHidden(false); try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ } };

  if (hidden) {
    return <button type="button" className="guide-restore" onClick={show}>Show guide</button>;
  }
  if (!note) return null;

  return (
    <div className={`guide guide-${side}`} onMouseLeave={() => setOpen(false)}>
      {open && (
        <div className={`guide-bubble ${note.kind}`} role="status">
          <p>{note.text}</p>
          <button type="button" className="guide-hide" onClick={hide}>Hide guide</button>
        </div>
      )}
      {!open && unread && (
        <span className={`guide-signal ${note.kind}`} aria-hidden="true">
          {note.kind === 'thought' ? <><i /><i /><i /></> : '!'}
        </span>
      )}
      <button
        key={hop}
        type="button"
        className={`guide-btn${unread ? ' unread' : ''}`}
        aria-label={unread ? `Dawood has a ${note.kind} for you` : 'Dawood’s guide'}
        aria-expanded={open}
        onMouseEnter={read}
        onFocus={read}
        onClick={() => (open ? setOpen(false) : read())}
      >
        <Avatar size={112} />
      </button>
    </div>
  );
}
