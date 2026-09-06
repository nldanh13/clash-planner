/**
 * Large poster-style illustrations for the Town-Hall troop-tier cards.
 * Original silhouette scenes (not traced from any reference image) — a
 * dark gradient sky, a broken wall/base line, and a simplified troop
 * silhouette rim-lit in the tier's accent color. Kept abstract on purpose:
 * a wide banner has to read at a glance, so detail goes into feel and
 * motion rather than into any individual unit's likeness.
 */
import type { ReactElement } from "react";

const SCENES: Record<string, { accent: string; accent2: string; render: (id: string) => ReactElement }> = {
  "TH7–8": {
    accent: "#eaa845",
    accent2: "#5c4321",
    render: (id) => (
      <>
        <polygon points="0,140 0,86 34,86 34,66 60,66 60,96 90,96 90,72 120,72 120,140" fill={`url(#${id}-wall)`} />
        <polygon points="66,96 60,66 90,96 84,110 70,112" fill="#3a2c15" opacity="0.9" />
        <circle cx="72" cy="80" r="26" fill={`url(#${id}-glow)`} opacity="0.55" />
        <rect x="52" y="58" width="34" height="46" rx="6" fill="#caa25c" />
        <rect x="44" y="72" width="14" height="30" rx="5" fill="#b78d49" />
        <rect x="80" y="72" width="14" height="30" rx="5" fill="#b78d49" />
        <circle cx="61" cy="68" r="3.2" fill="#fff3d6" />
        <circle cx="77" cy="68" r="3.2" fill="#fff3d6" />
        <g opacity="0.85">
          <circle cx="132" cy="98" r="9" fill="#274a3a" />
          <polygon points="132,80 138,92 126,92" fill="#eaa845" />
          <circle cx="139" cy="90" r="3" fill="#f5d187" opacity="0.9" />
        </g>
        <polygon points="30,110 44,96 40,116 26,122" fill="#1c150a" opacity="0.6" />
        <polygon points="95,116 110,102 106,122 92,128" fill="#1c150a" opacity="0.5" />
      </>
    ),
  },
  "TH9–10": {
    accent: "#e0803c",
    accent2: "#5a3418",
    render: (id) => (
      <>
        <path d="M0,140 L0,100 Q40,88 80,100 L80,140Z" fill={`url(#${id}-wall)`} />
        <path d="M240,140 L240,100 Q280,88 320,100 L320,140Z" fill={`url(#${id}-wall)`} />
        <path d="M40,98 Q120,20 200,70" stroke="#e0803c" strokeWidth="2" strokeDasharray="3 6" fill="none" opacity="0.6" />
        <g transform="translate(150,58) rotate(-18)">
          <ellipse cx="0" cy="0" rx="22" ry="13" fill="#c9793f" />
          <circle cx="-20" cy="-4" r="9" fill="#c9793f" />
          <path d="M-30,-8 q6,-8 12,0" stroke="#3a2313" strokeWidth="2" fill="none" />
          <circle cx="90" cy="70" r="3" fill="#1c150a" opacity="0" />
        </g>
        <circle cx="150" cy="58" r="34" fill={`url(#${id}-glow)`} opacity="0.35" />
        <ellipse cx="105" cy="122" rx="30" ry="8" fill="#2a1c0e" opacity="0.5" />
        <ellipse cx="230" cy="128" rx="22" ry="6" fill="#2a1c0e" opacity="0.4" />
      </>
    ),
  },
  "TH11–12": {
    accent: "#4dbdd2",
    accent2: "#123844",
    render: (id) => (
      <>
        <rect x="230" y="90" width="26" height="50" fill={`url(#${id}-wall)`} />
        <polygon points="230,90 243,68 256,90" fill="#0f2a33" />
        <circle cx="243" cy="105" r="4" fill="#7fe6f7" />
        <g transform="translate(95,55)">
          <polygon points="0,-10 36,4 0,14 -14,10 -30,20 -16,2 -30,-14 -14,-8" fill="#3a9fb5" />
          <circle cx="20" cy="0" r="6" fill="#3a9fb5" />
        </g>
        <path d="M118,52 L160,68 L146,74 L200,92 L172,90 L243,105" stroke="#f0c054" strokeWidth="2.2" fill="none" opacity="0.9" />
        <circle cx="243" cy="105" r="16" fill={`url(#${id}-glow)`} opacity="0.6" />
        <circle cx="90" cy="40" r="30" fill={`url(#${id}-glow)`} opacity="0.25" />
      </>
    ),
  },
  "TH13–14": {
    accent: "#5fc887",
    accent2: "#1c3a26",
    render: () => (
      <>
        <rect x="252" y="80" width="24" height="60" fill="#233a2c" />
        <polygon points="252,80 264,60 276,80" fill="#1a2b20" />
        <circle cx="264" cy="96" r="4" fill="#ffd9a0" />
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i} transform={`translate(${30 + i * 34},${90 - (i % 2) * 6})`}>
            <circle cx="0" cy="-14" r="7" fill="#5fc887" />
            <rect x="-6" y="-8" width="12" height="20" rx="4" fill="#3f9c66" />
            <line x1="6" y1="-10" x2="30" y2={-6 - i * 4} stroke="#eaf7ea" strokeWidth="1.2" opacity="0.85" />
          </g>
        ))}
        <circle cx="264" cy="96" r="14" fill="url(#glow-shared)" opacity="0.55" />
      </>
    ),
  },
  "TH15–16": {
    accent: "#8a5fd1",
    accent2: "#2a1c4a",
    render: (id) => (
      <>
        <circle cx="160" cy="70" r="52" fill="none" stroke="#8a5fd1" strokeWidth="1.4" opacity="0.35" />
        <circle cx="160" cy="70" r="36" fill="none" stroke="#8a5fd1" strokeWidth="1.4" opacity="0.5" />
        <circle cx="160" cy="70" r="20" fill={`url(#${id}-glow)`} opacity="0.75" />
        <path d="M140,95 Q160,60 180,95 L172,110 Q160,118 148,110Z" fill="#dfe8ee" />
        <circle cx="153" cy="88" r="2.4" fill="#1a202c" />
        <circle cx="167" cy="88" r="2.4" fill="#1a202c" />
        <rect x="150" y="122" width="20" height="14" fill="#2a1c4a" opacity="0.6" />
        <polygon points="150,122 160,108 170,122" fill="#241a3f" opacity="0.7" />
      </>
    ),
  },
  "TH17–18": {
    accent: "#e0525f",
    accent2: "#3a1218",
    render: (id) => (
      <>
        <path d="M0,140 L0,110 Q60,90 120,110 L180,96 Q240,80 320,100 L320,140Z" fill={`url(#${id}-wall)`} />
        <path d="M40,118 l14,-14 -4,14 10,-4 -6,12" fill="#e0525f" opacity="0.8" />
        <path d="M110,110 l16,-16 -4,16 12,-6 -8,14" fill="#e0525f" opacity="0.7" />
        <g transform="translate(90,55)">
          <polygon points="-30,10 0,-16 30,10 14,26 -14,26" fill="#b53f4a" />
          <polygon points="-10,-14 0,-24 10,-14" fill="#ecdcb3" />
          <circle cx="-8" cy="4" r="2.4" fill="#1a0a0a" />
          <circle cx="8" cy="4" r="2.4" fill="#1a0a0a" />
        </g>
        {[0, 1, 2].map((i) => (
          <circle key={i} cx={150 + i * 26} cy={70 + (i % 2) * 10} r="5" fill="#e0525f" opacity="0.8" />
        ))}
        <circle cx="90" cy="45" r="36" fill={`url(#${id}-glow)`} opacity="0.4" />
      </>
    ),
  },
};

export function AttackScene({ range }: { range: string }) {
  const scene = SCENES[range];
  if (!scene) return null;
  const id = `scene-${range.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <svg viewBox="0 0 320 140" className="guide-scene-svg" role="img" aria-label={`Minh hoạ tổ hợp quân ${range}`}>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0c1720" />
          <stop offset="100%" stopColor={scene.accent2} />
        </linearGradient>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={scene.accent2} />
          <stop offset="100%" stopColor="#090f15" />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0%" stopColor={scene.accent} stopOpacity="0.9" />
          <stop offset="100%" stopColor={scene.accent} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="glow-shared">
          <stop offset="0%" stopColor="#5fc887" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#5fc887" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="320" height="140" fill={`url(#${id}-sky)`} />
      {scene.render(id)}
      <rect x="0" y="0" width="320" height="140" fill="none" />
    </svg>
  );
}
