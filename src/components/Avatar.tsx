export type Activity =
  | 'idle' | 'wave' | 'typing' | 'coffee' | 'juggle' | 'wrench' | 'phone' | 'sleep' | 'stretch' | 'peek' | 'surprised';

// Arm angles (degrees) per activity, around each shoulder.
const ARMS: Record<Activity, { r: number; l: number }> = {
  idle: { r: 162, l: 0 }, wave: { r: 0, l: 0 }, typing: { r: 138, l: -38 }, coffee: { r: 20, l: 0 },
  juggle: { r: -18, l: 158 }, wrench: { r: 70, l: 0 }, phone: { r: 62, l: 0 }, sleep: { r: 166, l: 4 },
  stretch: { r: -28, l: 168 }, peek: { r: 0, l: 0 }, surprised: { r: -10, l: 150 },
};

// Illustrated Dawood with swappable props. Pupils follow (dx, dy).
export default function Avatar({ size = 112, activity = 'idle', look = { x: 0, y: 0 } }: { size?: number; activity?: Activity; look?: { x: number; y: number } }) {
  const a = ARMS[activity];
  const asleep = activity === 'sleep';
  return (
    <svg className={`av av-${activity}`} width={size} height={size * 1.633} viewBox="0 -40 120 196" aria-hidden="true" overflow="visible">
      <defs>
        <pattern id="av-check" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#1B1C20" /><rect width="4" height="4" fill="#2E3036" /><rect x="4" y="4" width="4" height="4" fill="#2E3036" />
        </pattern>
        <linearGradient id="av-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#16171A" /><stop offset="1" stopColor="#4A4B50" /></linearGradient>
      </defs>

      <ellipse cx="60" cy="151" rx="30" ry="4" fill="rgba(21,22,26,.18)" />

      {/* juggling KADS letters */}
      {activity === 'juggle' && (
        <g className="av-juggle">
          {['K', 'A', 'D', 'S'].map((l, i) => (
            <g key={l} className="av-ball" style={{ animationDelay: `${-i * 0.45}s` }}>
              <circle r="8" fill={i === 1 ? '#E5480D' : '#15161A'} /><text y="3.5" textAnchor="middle" fontSize="10" fontWeight="800" fill={i === 1 ? '#15161A' : '#F7F5F0'} fontFamily="Montserrat, sans-serif">{l}</text>
            </g>
          ))}
        </g>
      )}

      {/* body */}
      <g className="av-body">
        <path d="M24 150 C24 122 36 106 60 106 C84 106 96 122 96 150 Z" fill="url(#av-check)" />
        <path d="M50 106 L60 122 L70 106 Z" fill="#9A6649" />
        <path d="M47 105 L60 118 L56 124 L42 110 Z M73 105 L60 118 L64 124 L78 110 Z" fill="#111215" />
        <circle cx="60" cy="130" r="1.6" fill="#55575E" /><circle cx="60" cy="139" r="1.6" fill="#55575E" />
        <g className="av-larm" style={{ transform: `rotate(${a.l}deg)` }}>
          <path d="M28 124 C22 132 22 142 25 150 L33 150 C32 142 33 134 36 128 Z" fill="url(#av-check)" />
          <circle cx="29" cy="151" r="6" fill="#B07B5A" />
        </g>
        <g className={`av-arm${activity === 'wave' ? ' waving' : ''}`} style={{ transform: `rotate(${a.r}deg)` }}>
          <path d="M92 124 C99 118 104 108 104 98 L96 96 C95 104 91 112 86 118 Z" fill="url(#av-check)" />
          <circle cx="100" cy="94" r="6.5" fill="#B07B5A" />
          {activity === 'coffee' && (
            <g className="av-mug">
              <rect x="94" y="78" width="13" height="15" rx="2.5" fill="#F7F5F0" stroke="#15161A" strokeWidth="1.5" />
              <path d="M107 82 C112 82 112 89 107 89" fill="none" stroke="#15161A" strokeWidth="1.5" />
              <rect x="94" y="78" width="13" height="4" fill="#E5480D" />
              <path className="av-steam" d="M98 74 C96 70 100 68 98 64 M103 74 C101 70 105 68 103 64" stroke="#8F8D88" strokeWidth="1.3" fill="none" strokeLinecap="round" />
            </g>
          )}
          {activity === 'wrench' && (
            <path d="M100 88 L100 70 M95 66 C95 60 105 60 105 66 L102 66 L102 70 L98 70 L98 66 Z" stroke="#8F8D88" strokeWidth="3.5" fill="#8F8D88" strokeLinecap="round" />
          )}
          {activity === 'phone' && (
            <g><rect x="94" y="80" width="11" height="18" rx="2" fill="#15161A" /><rect className="av-screen" x="95.5" y="82" width="8" height="13" rx="1" fill="#E5480D" /></g>
          )}
        </g>
      </g>

      {/* head */}
      <g className="av-head">
        <rect x="52" y="90" width="16" height="16" rx="6" fill="#9A6649" />
        <ellipse cx="33" cy="64" rx="5" ry="7.5" fill="#A06C4C" /><ellipse cx="87" cy="64" rx="5" ry="7.5" fill="#A06C4C" />
        <path d="M34 54 C34 32 46 22 60 22 C74 22 86 32 86 54 L86 70 C86 88 74 100 60 100 C46 100 34 88 34 70 Z" fill="#B07B5A" />
        <path d="M33 58 C31 34 44 18 61 18 C78 18 90 30 87 58 C85 48 84 42 81 39 C72 34 52 33 41 39 C37 43 35 50 33 58 Z" fill="url(#av-fade)" />
        <path d="M40 38 C50 28 70 26 82 36 C74 31 56 29 44 36 Z" fill="#0F1012" />
        <path d="M47 33 L54 27" stroke="#2A2B30" strokeWidth="1.2" strokeLinecap="round" />
        <g className="av-brows" style={{ transform: activity === 'surprised' ? 'translateY(-3px)' : undefined }}>
          <path d="M43 54 C47 51 52 51 55 53" stroke="#141518" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M65 53 C68 51 73 51 77 54" stroke="#141518" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
        {asleep ? (
          <g stroke="#141518" strokeWidth="2.2" strokeLinecap="round" fill="none"><path d="M46 62 C48 64 52 64 54 62" /><path d="M66 62 C68 64 72 64 74 62" /></g>
        ) : (
          <g className="av-eyes">
            <ellipse cx="50" cy="62" rx="3.6" ry="4" fill="#FFFFFF" /><ellipse cx="70" cy="62" rx="3.6" ry="4" fill="#FFFFFF" />
            <g style={{ transform: `translate(${look.x}px, ${look.y}px)`, transition: 'transform .12s linear' }}>
              <circle cx="50" cy="62" r={activity === 'surprised' ? 2 : 2.7} fill="#141518" /><circle cx="70" cy="62" r={activity === 'surprised' ? 2 : 2.7} fill="#141518" />
              <circle cx="51" cy="61" r=".8" fill="#fff" /><circle cx="71" cy="61" r=".8" fill="#fff" />
            </g>
          </g>
        )}
        <path d="M60 64 C58 70 57 73 60 75 C62 75.5 63 75 64 74" stroke="#8C5A3E" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M36 70 C37 88 47 100 60 100 C73 100 83 88 84 70 C82 78 78 82 74 84 C70 80 66 79 60 79 C54 79 50 80 46 84 C42 82 38 78 36 70 Z" fill="#1A1B1E" />
        <path d="M49 82 C54 78 66 78 71 82 C67 81 63 81 60 82 C57 81 53 81 49 82 Z" fill="#1A1B1E" />
        {activity === 'surprised'
          ? <ellipse cx="60" cy="87" rx="3" ry="3.6" fill="#7A4A35" />
          : <path d="M54 86 C58 88 62 88 66 86" stroke="#7A4A35" strokeWidth="2.2" strokeLinecap="round" fill="none" />}
      </g>

      {/* props in front */}
      {activity === 'typing' && (
        <g className="av-laptop">
          <path d="M30 116 L90 116 L86 140 L34 140 Z" fill="#2A2B30" />
          <path d="M24 140 L96 140 L100 148 L20 148 Z" fill="#3A3B40" />
          <text x="60" y="132" textAnchor="middle" fontSize="11" fontWeight="800" fill="#E5480D" fontFamily="Montserrat, sans-serif">K</text>
          <g className="av-keys"><circle cx="44" cy="144" r="1.4" fill="#F7F5F0" /><circle cx="60" cy="144" r="1.4" fill="#F7F5F0" /><circle cx="76" cy="144" r="1.4" fill="#F7F5F0" /></g>
        </g>
      )}
      {activity === 'wrench' && (
        <g className="av-gear" style={{ transformOrigin: '14px 128px' }}>
          <circle cx="14" cy="128" r="9" fill="none" stroke="#E5480D" strokeWidth="4" strokeDasharray="4 3" />
          <circle cx="14" cy="128" r="4" fill="#E5480D" />
        </g>
      )}
      {asleep && (
        <g className="av-zzz" fontFamily="Montserrat, sans-serif" fontWeight="800" fill="#15161A">
          <text x="92" y="30" fontSize="11">z</text><text x="100" y="18" fontSize="14">z</text><text x="108" y="2" fontSize="18">Z</text>
        </g>
      )}
    </svg>
  );
}
