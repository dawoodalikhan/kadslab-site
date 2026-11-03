import type { ReactNode } from 'react';

type DeviceScrollerProps = {
  label: string;          // industry only, never a client name
  height?: number;        // screen height in px
  children: ReactNode;    // the original concept page that scrolls inside
  locked?: boolean;       // NDA overlay on hover; the screen never opens or enlarges
};

// Laptop frame with an auto-scrolling screen. Motion is pure CSS
// (.mac-scroll), so it costs no JavaScript and stops for visitors
// who ask for reduced motion.
export default function DeviceScroller({ label, height = 300, children, locked = true }: DeviceScrollerProps) {
  return (
    <figure className="mac" aria-label={`${label}: original concept, client work under NDA`} style={{ margin: 0 }}>
      <div className="mac-frame">
        <div className="mac-screen" style={{ height }}>
          <div className="mac-scroll" aria-hidden="true">{children}</div>
          {locked && <LockOverlay />}
        </div>
      </div>
      <div className="mac-base" aria-hidden="true" />
      {locked && <span className="mac-badge" aria-hidden="true"><LockIcon size={10} />NDA</span>}
    </figure>
  );
}

function LockOverlay() {
  return (
    <div className="mac-lock">
      <LockIcon size={30} />
      <span style={{ fontSize: 16, fontWeight: 600 }}>Details locked under NDA</span>
      <span style={{ fontSize: 13, color: '#C8C9CE', maxWidth: 300 }}>This screen is an original concept. Client names, designs and code aren’t shown.</span>
    </div>
  );
}

function LockIcon({ size }: { size: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
