// Illustrated Dawood: short dark fade, full beard, dark checkered polo.
// Parts are separate groups so CSS can blink the eyes, bob the head and wave the arm.
export default function Avatar({ size = 120 }: { size?: number }) {
  return (
    <svg className="av" width={size} height={size * 1.3} viewBox="0 0 120 156" aria-hidden="true">
      <defs>
        <pattern id="av-check" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#1B1C20" />
          <rect width="4" height="4" fill="#2E3036" />
          <rect x="4" y="4" width="4" height="4" fill="#2E3036" />
        </pattern>
        <linearGradient id="av-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#16171A" />
          <stop offset="1" stopColor="#4A4B50" />
        </linearGradient>
      </defs>

      <ellipse className="av-shadow" cx="60" cy="151" rx="30" ry="4" fill="rgba(21,22,26,.18)" />

      {/* body */}
      <g className="av-body">
        <path d="M24 150 C24 122 36 106 60 106 C84 106 96 122 96 150 Z" fill="url(#av-check)" />
        <path d="M50 106 L60 122 L70 106 Z" fill="#9A6649" />
        <path d="M47 105 L60 118 L56 124 L42 110 Z M73 105 L60 118 L64 124 L78 110 Z" fill="#111215" />
        <circle cx="60" cy="130" r="1.6" fill="#55575E" />
        <circle cx="60" cy="139" r="1.6" fill="#55575E" />
        {/* left arm */}
        <path d="M28 124 C22 132 22 142 25 150 L33 150 C32 142 33 134 36 128 Z" fill="url(#av-check)" />
        {/* right arm (waves) */}
        <g className="av-arm">
          <path d="M92 124 C99 118 104 108 104 98 L96 96 C95 104 91 112 86 118 Z" fill="url(#av-check)" />
          <circle cx="100" cy="94" r="6.5" fill="#B07B5A" />
        </g>
      </g>

      {/* head */}
      <g className="av-head">
        <rect x="52" y="90" width="16" height="16" rx="6" fill="#9A6649" />
        <ellipse cx="33" cy="64" rx="5" ry="7.5" fill="#A06C4C" />
        <ellipse cx="87" cy="64" rx="5" ry="7.5" fill="#A06C4C" />
        <path d="M34 54 C34 32 46 22 60 22 C74 22 86 32 86 54 L86 70 C86 88 74 100 60 100 C46 100 34 88 34 70 Z" fill="#B07B5A" />
        {/* hair: short fade with side part */}
        <path d="M33 58 C31 34 44 18 61 18 C78 18 90 30 87 58 C85 48 84 42 81 39 C72 34 52 33 41 39 C37 43 35 50 33 58 Z" fill="url(#av-fade)" />
        <path d="M40 38 C50 28 70 26 82 36 C74 31 56 29 44 36 Z" fill="#0F1012" />
        <path d="M47 33 L54 27" stroke="#2A2B30" strokeWidth="1.2" strokeLinecap="round" />
        {/* brows */}
        <path d="M43 54 C47 51 52 51 55 53" stroke="#141518" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M65 53 C68 51 73 51 77 54" stroke="#141518" strokeWidth="3" strokeLinecap="round" fill="none" />
        {/* eyes */}
        <g className="av-eyes">
          <ellipse cx="50" cy="62" rx="3.2" ry="3.6" fill="#141518" />
          <ellipse cx="70" cy="62" rx="3.2" ry="3.6" fill="#141518" />
          <circle cx="51.2" cy="60.8" r="1" fill="#fff" />
          <circle cx="71.2" cy="60.8" r="1" fill="#fff" />
        </g>
        {/* nose */}
        <path d="M60 64 C58 70 57 73 60 75 C62 75.5 63 75 64 74" stroke="#8C5A3E" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        {/* beard + mustache */}
        <path d="M36 70 C37 88 47 100 60 100 C73 100 83 88 84 70 C82 78 78 82 74 84 C70 80 66 79 60 79 C54 79 50 80 46 84 C42 82 38 78 36 70 Z" fill="#1A1B1E" />
        <path d="M49 82 C54 78 66 78 71 82 C67 81 63 81 60 82 C57 81 53 81 49 82 Z" fill="#1A1B1E" />
        <path d="M54 86 C58 88 62 88 66 86" stroke="#7A4A35" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}
