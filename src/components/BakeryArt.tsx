/**
 * Self-contained animated bakery illustration for the login hero.
 * Uses inline SVG + CSS keyframe classes from index.css (no external assets).
 */
export function BakeryArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 420" className={className} role="img" aria-label="Freshly baked goods" fill="none">
      <defs>
        <linearGradient id="ba-bread" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f4c17d" />
          <stop offset="100%" stopColor="#c9772f" />
        </linearGradient>
        <linearGradient id="ba-croissant" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f6cd8c" />
          <stop offset="100%" stopColor="#d68a37" />
        </linearGradient>
        <linearGradient id="ba-frost" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff6e2" />
          <stop offset="100%" stopColor="#ffd99a" />
        </linearGradient>
        <radialGradient id="ba-glow" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Backdrop glow + rotating dashed ring */}
      <circle cx="210" cy="205" r="165" fill="url(#ba-glow)" />
      <circle
        cx="210"
        cy="205"
        r="180"
        stroke="#ffffff"
        strokeOpacity="0.18"
        strokeWidth="2"
        strokeDasharray="3 14"
        className="anim-spin-slow"
      />

      {/* Twinkling sparkles */}
      {[
        [70, 110],
        [340, 130],
        [360, 260],
        [80, 300],
        [300, 70],
      ].map(([x, y], i) => (
        <g key={i} className="anim-twinkle" style={{ animationDelay: `${i * 0.5}s`, transformOrigin: `${x}px ${y}px` }}>
          <path
            d={`M ${x} ${y - 9} L ${x + 2.6} ${y - 2.6} L ${x + 9} ${y} L ${x + 2.6} ${y + 2.6} L ${x} ${y + 9} L ${x - 2.6} ${y + 2.6} L ${x - 9} ${y} L ${x - 2.6} ${y - 2.6} Z`}
            fill="#fde68a"
          />
        </g>
      ))}

      {/* Steam wisps */}
      <g stroke="#ffffff" strokeOpacity="0.55" strokeWidth="5" strokeLinecap="round" fill="none">
        <path className="anim-steam" d="M 196 175 q -9 -12 0 -24 q 9 -12 0 -24" />
        <path className="anim-steam anim-steam-2" d="M 222 172 q -9 -12 0 -24 q 9 -12 0 -24" />
        <path className="anim-steam anim-steam-3" d="M 248 176 q -9 -12 0 -24 q 9 -12 0 -24" />
      </g>

      {/* Plate */}
      <ellipse cx="210" cy="312" rx="150" ry="32" fill="#ffffff" fillOpacity="0.16" />
      <ellipse cx="210" cy="308" rx="120" ry="24" fill="#ffffff" fillOpacity="0.10" />

      {/* Bread loaf (center) */}
      <g className="anim-floaty">
        <path
          d="M 132 262 Q 128 196 210 196 Q 292 196 288 262 Q 288 276 272 276 L 148 276 Q 132 276 132 262 Z"
          fill="url(#ba-bread)"
        />
        <g stroke="#fff2d6" strokeOpacity="0.7" strokeWidth="5" strokeLinecap="round">
          <path d="M 168 224 l 16 -14" />
          <path d="M 198 220 l 16 -14" />
          <path d="M 228 224 l 16 -14" />
        </g>
        <ellipse cx="210" cy="205" rx="70" ry="10" fill="#ffe0a6" fillOpacity="0.55" />
      </g>

      {/* Croissant (front-left) */}
      <g className="anim-floaty-slow" style={{ transformOrigin: '150px 292px' }}>
        <path
          d="M 108 300 q 12 -34 46 -34 q 34 0 46 34 q -20 -14 -46 -14 q -26 0 -46 14 Z"
          fill="url(#ba-croissant)"
        />
        <g stroke="#b9722e" strokeOpacity="0.5" strokeWidth="3" strokeLinecap="round">
          <path d="M 138 274 l -6 16" />
          <path d="M 154 270 l 0 18" />
          <path d="M 170 274 l 6 16" />
        </g>
      </g>

      {/* Cupcake (front-right) */}
      <g className="anim-floaty" style={{ animationDelay: '0.8s', transformOrigin: '292px 288px' }}>
        <path d="M 262 292 L 322 292 L 314 322 Q 314 326 310 326 L 274 326 Q 270 326 270 322 Z" fill="#e88aa8" />
        <g stroke="#c96b8a" strokeOpacity="0.6" strokeWidth="3">
          <path d="M 278 294 l 3 30" />
          <path d="M 292 294 l 0 32" />
          <path d="M 306 294 l -3 30" />
        </g>
        <path
          d="M 258 292 Q 262 262 292 262 Q 322 262 326 292 Q 312 282 292 282 Q 272 282 258 292 Z"
          fill="url(#ba-frost)"
        />
        <circle cx="292" cy="256" r="9" fill="#ef4444" />
        <path d="M 292 247 q 6 -8 12 -6" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" fill="none" />
      </g>

      {/* Floating wheat grains */}
      <g fill="#fbbf5f" fillOpacity="0.85">
        <g className="anim-floaty-slow" style={{ transformOrigin: '355px 200px' }}>
          <ellipse cx="355" cy="200" rx="4.5" ry="9" transform="rotate(30 355 200)" />
        </g>
        <g className="anim-floaty" style={{ animationDelay: '1.4s', transformOrigin: '62px 200px' }}>
          <ellipse cx="62" cy="200" rx="4.5" ry="9" transform="rotate(-24 62 200)" />
        </g>
      </g>
    </svg>
  )
}
