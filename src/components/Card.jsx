import { DotsIcon } from "./Icons";
import "./Card.css";

function PurpleWaveDeco() {
  return (
    <svg className="card-deco-svg" viewBox="0 0 200 130" fill="none" preserveAspectRatio="xMaxYMax meet">
      {/* Wave lines */}
      <path d="M0,90 C25,65 50,100 80,75 C110,50 140,85 170,60 C185,50 195,45 200,42" stroke="rgba(139,92,246,0.35)" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M0,105 C25,80 50,115 80,90 C110,65 140,100 170,75 C185,65 195,60 200,57" stroke="rgba(167,139,250,0.2)" strokeWidth="2" strokeLinecap="round"/>
      {/* People illustration — overlapping circles */}
      <circle cx="148" cy="62" r="19" fill="rgba(167,139,250,0.45)"/>
      <circle cx="165" cy="57" r="15" fill="rgba(139,92,246,0.55)"/>
      <circle cx="133" cy="67" r="13" fill="rgba(196,181,253,0.4)"/>
      {/* Head dots */}
      <circle cx="148" cy="46" r="7" fill="rgba(139,92,246,0.65)"/>
      <circle cx="165" cy="42" r="6" fill="rgba(167,139,250,0.75)"/>
      <circle cx="133" cy="50" r="5.5" fill="rgba(196,181,253,0.7)"/>
    </svg>
  );
}

function BlueBarDeco() {
  return (
    <svg className="card-deco-svg" viewBox="0 0 200 130" fill="none" preserveAspectRatio="xMaxYMax meet">
      {/* 3D bar chart */}
      {/* Bar 1 (short) */}
      <rect x="105" y="90" width="22" height="32" rx="3" fill="rgba(99,179,237,0.65)"/>
      <ellipse cx="116" cy="90" rx="11" ry="3.5" fill="rgba(186,230,253,0.9)"/>
      {/* Bar 2 (medium) */}
      <rect x="132" y="72" width="22" height="50" rx="3" fill="rgba(59,130,246,0.75)"/>
      <ellipse cx="143" cy="72" rx="11" ry="3.5" fill="rgba(186,230,253,0.9)"/>
      {/* Bar 3 (tall) */}
      <rect x="159" y="52" width="22" height="70" rx="3" fill="rgba(37,99,235,0.85)"/>
      <ellipse cx="170" cy="52" rx="11" ry="3.5" fill="rgba(186,230,253,0.9)"/>
      {/* Shine on bars */}
      <rect x="107" y="93" width="5" height="26" rx="2" fill="rgba(255,255,255,0.3)"/>
      <rect x="134" y="75" width="5" height="44" rx="2" fill="rgba(255,255,255,0.3)"/>
      <rect x="161" y="55" width="5" height="64" rx="2" fill="rgba(255,255,255,0.3)"/>
    </svg>
  );
}

function AmberWaveDeco() {
  return (
    <svg className="card-deco-svg" viewBox="0 0 200 130" fill="none" preserveAspectRatio="xMaxYMax meet">
      {/* Wave lines — amber */}
      <path d="M0,85 C25,60 50,95 80,70 C110,45 140,80 170,55 C185,45 195,38 200,34" stroke="rgba(251,191,36,0.45)" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M0,100 C25,75 50,110 80,85 C110,60 140,95 170,70 C185,60 195,53 200,49" stroke="rgba(253,230,138,0.3)" strokeWidth="2" strokeLinecap="round"/>
      {/* Lightning bolt — amber/orange matching the bulb glow */}
      <path d="M162,28 L148,62 L160,60 L146,97 L174,56 L162,59 L176,28Z" fill="rgba(245,158,11,0.88)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

const decoMap = {
  purple: PurpleWaveDeco,
  blue: BlueBarDeco,
  pink: AmberWaveDeco,
};

export default function Card({ icon, title, value, subtitle, trend, variant = "default", children }) {
  const DecoDraw = decoMap[variant];

  return (
    <div className={`card card--${variant}`}>
      <div className="card-top">
        {icon && (
          <div className="card-icon-wrapper">
            <span className="card-icon">{icon}</span>
          </div>
        )}
        <button className="card-menu-btn" aria-label="Options">
          <DotsIcon size={16} />
        </button>
      </div>

      {DecoDraw && (
        <div className="card-deco-area">
          <DecoDraw />
        </div>
      )}

      <div className="card-content">
        {value !== undefined && <div className="card-value">{value}</div>}
        <h3 className="card-title">{title}</h3>
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
        {trend && (
          <div className={`card-trend ${trend.positive ? "positive" : "negative"}`}>
            <span className="trend-arrow">{trend.positive ? "↑" : "↓"}</span>
            <span className="trend-val">{Math.abs(trend.value)}%</span>
            <span className="trend-label">{trend.label}</span>
          </div>
        )}
        {children && <div className="card-body">{children}</div>}
      </div>
    </div>
  );
}
