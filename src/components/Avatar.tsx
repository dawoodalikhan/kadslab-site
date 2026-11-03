export type Activity =
  | 'idle' | 'wave' | 'typing' | 'coffee' | 'juggle' | 'wrench' | 'phone' | 'sleep' | 'stretch' | 'peek' | 'surprised';

// Arm angles (degrees) per activity, around each shoulder.
const ARMS: Record<Activity, { r: number; l: number }> = {
  idle: { r: 160, l: 0 }, wave: { r: 0, l: 0 }, typing: { r: 138, l: -38 }, coffee: { r: 20, l: 0 },
  juggle: { r: -18, l: 158 }, wrench: { r: 70, l: 0 }, phone: { r: 62, l: 0 }, sleep: { r: 164, l: 4 },
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

      {/* body: athletic, fitted tee */}
      <g className="av-body">
        <path d="M12 152 C12 130 22 115 40 110 L80 110 C98 115 108 130 108 152 Z" fill="#23252A" />
        <path d="M30 128 C40 132 52 132 58 128 M62 128 C68 132 80 132 90 128" stroke="#2F3238" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M46 108 C50 116 70 116 74 108 Z" fill="#C28E67" />
        <path d="M44 108 C50 118 70 118 76 108" stroke="#E5480D" strokeWidth="3" fill="none" />
        <g className="av-larm" style={{ transform: `rotate(${a.l}deg)` }}>
          <path d="M18 120 C10 128 10 142 14 151 L27 151 C26 142 27 132 32 124 Z" fill="#23252A" />
          <path d="M14 140 C13 145 14 149 15 151 L26 151 C26 147 26 143 27 140 Z" fill="#D9A77F" />
          <circle cx="20.5" cy="153" r="6.5" fill="#D9A77F" />
        </g>
        <g className={`av-arm${activity === 'wave' ? ' waving' : ''}`} style={{ transform: `rotate(${a.r}deg)` }}>
          <path d="M98 126 C106 120 110 108 108 98 L96 96 C96 104 93 112 86 118 Z" fill="#23252A" />
          <path d="M108 98 C108 104 107 108 105 112 L95 108 C96 104 96 100 96 96 Z" fill="#D9A77F" />
          <circle cx="102" cy="92" r="7" fill="#D9A77F" />
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
        <rect x="51" y="92" width="18" height="18" rx="7" fill="#C28E67" />
        <ellipse cx="33" cy="64" rx="5" ry="7.5" fill="#CC9772" /><ellipse cx="87" cy="64" rx="5" ry="7.5" fill="#CC9772" />
        <path d="M34 54 C34 32 46 24 60 24 C74 24 86 32 86 54 L86 70 C86 88 74 100 60 100 C46 100 34 88 34 70 Z" fill="#D9A77F" />
        {/* medium curls */}
        <g fill="#2B1E17">
          <path d="M33 56 C30 40 38 26 50 22 L72 22 C84 26 91 40 87 56 C85 48 82 43 78 41 C66 37 54 37 42 41 C38 43 35 48 33 56 Z" />
          <circle cx="38" cy="36" r="8" /><circle cx="47" cy="25" r="9" /><circle cx="60" cy="21" r="9.5" /><circle cx="73" cy="25" r="9" />
          <circle cx="82" cy="36" r="8" /><circle cx="53" cy="33" r="7" /><circle cx="67" cy="32" r="7" /><circle cx="36" cy="47" r="5" /><circle cx="84" cy="47" r="5" />
        </g>
        <g fill="none" stroke="#4A3428" strokeWidth="1.3" strokeLinecap="round">
          <path d="M44 24 C46 21 50 21 51 24" /><path d="M57 18 C59 16 63 16 64 19" /><path d="M70 23 C72 21 76 22 76 25" /><path d="M36 33 C37 30 41 30 42 33" /><path d="M79 33 C80 30 84 31 85 34" /><path d="M50 31 C52 29 55 30 56 32" /><path d="M64 30 C66 28 69 29 70 31" />
        </g>
        <g className="av-brows" style={{ transform: activity === 'surprised' ? 'translateY(-3px)' : 'translateY(-1px)' }}>
          <path d="M43 53 C46 50 51 50 55 52" stroke="#2B1E17" strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <path d="M65 52 C69 50 74 50 77 53" stroke="#2B1E17" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        </g>
        {asleep ? (
          <g stroke="#2B1E17" strokeWidth="2.2" strokeLinecap="round" fill="none"><path d="M46 62 C48 64 52 64 54 62" /><path d="M66 62 C68 64 72 64 74 62" /></g>
        ) : (
          <g className="av-eyes">
            <ellipse cx="50" cy="62" rx="3.8" ry="4" fill="#FFFFFF" /><ellipse cx="70" cy="62" rx="3.8" ry="4" fill="#FFFFFF" />
            <g style={{ transform: `translate(${look.x}px, ${look.y}px)`, transition: 'transform .12s linear' }}>
              <circle cx="50" cy="62" r={activity === 'surprised' ? 2 : 2.8} fill="#3B2618" /><circle cx="70" cy="62" r={activity === 'surprised' ? 2 : 2.8} fill="#3B2618" />
              <circle cx="51" cy="61" r=".9" fill="#fff" /><circle cx="71" cy="61" r=".9" fill="#fff" />
            </g>
            {/* happy lower lids */}
            {activity !== 'surprised' && <g stroke="#C28E67" strokeWidth="1.6" fill="none" strokeLinecap="round"><path d="M46 66 C48 67.5 52 67.5 54 66" /><path d="M66 66 C68 67.5 72 67.5 74 66" /></g>}
          </g>
        )}
        <ellipse cx="43" cy="73" rx="4.5" ry="2.8" fill="#E8907A" opacity=".35" /><ellipse cx="77" cy="73" rx="4.5" ry="2.8" fill="#E8907A" opacity=".35" />
        <path d="M60 64 C58 70 57.5 72.5 60 74 C61.5 74.5 63 74 64 73" stroke="#B57E59" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        {/* short trimmed beard and mustache */}
        <path d="M36 72 C38 89 48 100 60 100 C72 100 82 89 84 72 C82 79 79 83 75 85 C72 88 67 90 60 90 C53 90 48 88 45 85 C41 83 38 79 36 72 Z" fill="#3A2A21" opacity=".72" />
        <path d="M50 79.5 C55 76.5 65 76.5 70 79.5 C66 78.5 63 79 60 79.5 C57 79 54 78.5 50 79.5 Z" fill="#3A2A21" opacity=".85" />
        {activity === 'surprised'
          ? <ellipse cx="60" cy="85" rx="3.2" ry="3.8" fill="#7A3B2E" />
          : (
            <g>
              <path d="M49 81 C53 90 67 90 71 81 Z" fill="#7A3B2E" />
              <path d="M50.5 81.5 L69.5 81.5 L68 84.5 C63 86 57 86 52 84.5 Z" fill="#FFFFFF" /><path d="M54 87.5 C58 89 62 89 66 87.5" stroke="#C0574A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            </g>
          )}
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
