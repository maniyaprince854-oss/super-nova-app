import "./NovaLogo.css";

/* ── Glowing lightbulb SVG — faithfully recreated from the Nova Classes brand mark ── */
function Bulb({ size = 48 }) {
  const h = Math.round(size * (62 / 48));
  return (
    <svg width={size} height={h} viewBox="0 0 48 62" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Main glass fill — white-hot center to deep orange edge */}
        <radialGradient id="bulbFill" cx="38%" cy="28%" r="64%">
          <stop offset="0%"   stopColor="#fffde0"/>
          <stop offset="20%"  stopColor="#fde68a"/>
          <stop offset="46%"  stopColor="#fbbf24"/>
          <stop offset="74%"  stopColor="#f97316"/>
          <stop offset="100%" stopColor="#c2410c"/>
        </radialGradient>

        {/* Outer warm bloom spreading from the glass */}
        <radialGradient id="glowOuter" cx="50%" cy="42%" r="50%">
          <stop offset="0%"   stopColor="rgba(251,191,36,0.7)"/>
          <stop offset="40%"  stopColor="rgba(249,115,22,0.28)"/>
          <stop offset="100%" stopColor="rgba(249,115,22,0)"/>
        </radialGradient>

        {/* Bloom filter — big soft halo */}
        <filter id="bulbGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="6" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>

        {/* Filament glow */}
        <filter id="filGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.8" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Outer ambient bloom */}
      <ellipse cx="24" cy="22" rx="22" ry="22" fill="url(#glowOuter)"/>

      {/* Glass bulb body */}
      <path
        d="M24 3 C12 3 5.5 11 5.5 20 C5.5 28.5 10 34.5 16 38 L16 43 L32 43 L32 38 C38 34.5 42.5 28.5 42.5 20 C42.5 11 36 3 24 3 Z"
        fill="url(#bulbFill)"
        filter="url(#bulbGlow)"
      />

      {/* Primary shine highlight */}
      <ellipse cx="16.5" cy="13" rx="4" ry="6.5"
        fill="rgba(255,255,255,0.45)"
        transform="rotate(-20 16.5 13)"
      />
      {/* Secondary specular */}
      <ellipse cx="22" cy="10.5" rx="2" ry="3.5"
        fill="rgba(255,255,255,0.28)"
        transform="rotate(-18 22 10.5)"
      />

      {/* Filament — Y-shape with loops, glowing white */}
      <path
        d="M20.5 35.5 L20.5 28 C20.5 28 22 25 24 27.5 C26 25 27.5 28 27.5 28 L27.5 35.5"
        stroke="rgba(255,255,255,0.95)"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#filGlow)"
      />

      {/* Neck connector */}
      <rect x="16" y="43" width="16" height="2.5" rx="1.25" fill="#c4b5fd"/>

      {/* Coil rings — purple, darkening downward */}
      <rect x="16"   y="45.5" width="16" height="3.5" rx="1.75" fill="#9333ea"/>
      <rect x="16.5" y="49"   width="15" height="3"   rx="1.5"  fill="#7e22ce"/>
      <rect x="17"   y="52"   width="14" height="3"   rx="1.5"  fill="#6b21a8"/>
      <rect x="18"   y="55"   width="12" height="3.5" rx="1.75" fill="#581c87"/>
    </svg>
  );
}

/* ── Sidebar compact logo: small bulb + NOVA / CLASSES ── */
export function NovaLogoSidebar() {
  return (
    <div className="nova-sidebar-logo">
      <Bulb size={30}/>
      <div className="nova-sidebar-text">
        <span className="nova-brand-name">NOVA</span>
        <span className="nova-brand-sub">CLASSES</span>
      </div>
    </div>
  );
}

/* ── Auth pages — full centered logo matching brand image: N[bulb]VA / CLASSES. ── */
export function NovaLogoAuth() {
  return (
    <div className="nova-auth-logo">
      <div className="nova-auth-wordmark">
        <span className="nova-auth-letter">N</span>
        <div className="nova-auth-bulb-slot">
          <Bulb size={78}/>
        </div>
        <span className="nova-auth-letter">VA</span>
      </div>
      <p className="nova-auth-classes">CLASSES<span className="nova-auth-dot">.</span></p>
    </div>
  );
}
