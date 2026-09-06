/**
 * Small original flat-icon illustrations for the "Hướng dẫn" (Guide) tab.
 * These are hand-drawn stylized glyphs (not Supercell artwork or any
 * hotlinked third-party image) so each guide card gets a recognizable
 * visual without an external image dependency or copyright concern.
 */
import type { CSSProperties } from "react";
import type { GuideIconId } from "../../guideData";

const ICON_COLORS: Record<GuideIconId, string> = {
  golem: "#5fc887",
  hogRider: "#eaa845",
  electroDragon: "#4dbdd2",
  superArcher: "#5fc887",
  superYeti: "#c9d4db",
  dragonDuke: "#e66572",
  barbarianKing: "#eaa845",
  archerQueen: "#e66572",
  grandWarden: "#f0c054",
  royalChampion: "#4dbdd2",
  minionPrince: "#5fc887",
  scout: "#4dbdd2",
  cheapTroop: "#eaa845",
  funnel: "#f0c054",
  spellOrder: "#4dbdd2",
  heroAbility: "#f0c054",
  ccLure: "#e66572",
  compartments: "#5fc887",
  layeredCore: "#4dbdd2",
  decoyStorage: "#f0c054",
  airCoverage: "#4dbdd2",
  trapPlacement: "#e66572",
  plannerCheck: "#5fc887",
};

function Glyph({ id, color }: { id: GuideIconId; color: string }) {
  switch (id) {
    case "golem":
      return (
        <>
          <rect x="16" y="7" width="16" height="13" rx="4" fill={color} />
          <rect x="10" y="18" width="28" height="20" rx="5" fill={color} opacity="0.75" />
          <rect x="4" y="21" width="8" height="13" rx="3" fill={color} opacity="0.55" />
          <rect x="36" y="21" width="8" height="13" rx="3" fill={color} opacity="0.55" />
          <circle cx="20" cy="14" r="2.1" fill="#f0c054" />
          <circle cx="28" cy="14" r="2.1" fill="#f0c054" />
        </>
      );
    case "hogRider":
      return (
        <>
          <ellipse cx="23" cy="31" rx="15" ry="8.5" fill={color} />
          <circle cx="10" cy="27" r="6.5" fill={color} />
          <rect x="5" y="25" width="4" height="3" rx="1.2" fill="#7a4d1e" />
          <circle cx="27" cy="15" r="5.5" fill="#eec98a" />
          <rect x="23" y="19" width="9" height="10" rx="3" fill="#8a5a2b" />
          <rect x="32" y="12" width="3" height="14" rx="1.3" fill="#c9d4db" transform="rotate(28 32 12)" />
        </>
      );
    case "electroDragon":
      return (
        <>
          <polygon points="10,26 22,14 22,34" fill={color} opacity="0.65" />
          <polygon points="38,26 26,14 26,34" fill={color} opacity="0.65" />
          <ellipse cx="24" cy="28" rx="13" ry="7.5" fill={color} />
          <circle cx="36" cy="21" r="4.5" fill={color} />
          <polygon points="26,20 22,29 26,29 23,37 32,25 27,25" fill="#f0c054" />
        </>
      );
    case "superArcher":
      return (
        <>
          <circle cx="21" cy="11" r="5" fill={color} />
          <rect x="17" y="16" width="8" height="15" rx="3" fill={color} />
          <path d="M31 10 Q40 21 31 32" stroke={color} strokeWidth="2.4" fill="none" />
          <line x1="31" y1="10" x2="31" y2="32" stroke={color} strokeWidth="1.4" opacity="0.6" />
          <line x1="13" y1="30" x2="35" y2="12" stroke="#f0c054" strokeWidth="2" />
        </>
      );
    case "superYeti":
      return (
        <>
          <circle cx="24" cy="27" r="14" fill={color} />
          <polygon points="14,17 18,9 20,18" fill={color} />
          <polygon points="22,15 25,6 27,16" fill={color} />
          <polygon points="29,17 33,9 34,18" fill={color} />
          <circle cx="19" cy="26" r="2" fill="#1a202c" />
          <circle cx="29" cy="26" r="2" fill="#1a202c" />
          <path d="M18 33 Q24 37 30 33" stroke="#1a202c" strokeWidth="1.6" fill="none" />
        </>
      );
    case "dragonDuke":
      return (
        <>
          <polygon points="8,30 18,16 18,34" fill={color} opacity="0.6" />
          <polygon points="40,30 30,16 30,34" fill={color} opacity="0.6" />
          <path d="M17 32 Q24 12 31 32 Q24 40 17 32Z" fill={color} />
          <polygon points="19,14 22,6 24,13 26,6 29,14" fill="#f0c054" />
          <circle cx="21" cy="24" r="1.6" fill="#1a202c" />
          <circle cx="27" cy="24" r="1.6" fill="#1a202c" />
        </>
      );
    case "barbarianKing":
      return (
        <>
          <circle cx="24" cy="21" r="10" fill="#eec98a" />
          <path d="M14 24 Q24 34 34 24 L34 30 Q24 38 14 30Z" fill={color} />
          <polygon points="15,15 19,7 24,12 29,7 33,15 24,18" fill="#f0c054" />
          <rect x="35" y="26" width="3" height="14" rx="1.3" fill="#c9d4db" transform="rotate(22 35 26)" />
        </>
      );
    case "archerQueen":
      return (
        <>
          <circle cx="22" cy="19" r="9" fill="#eec98a" />
          <path d="M13 17 Q22 6 31 17" fill="none" stroke={color} strokeWidth="3" />
          <polygon points="15,12 22,7 20,15" fill="#f0c054" />
          <path d="M34 12 Q42 24 34 36" stroke={color} strokeWidth="2.4" fill="none" />
          <line x1="34" y1="12" x2="34" y2="36" stroke={color} strokeWidth="1.2" opacity="0.6" />
        </>
      );
    case "grandWarden":
      return (
        <>
          <polygon points="24,6 34,24 14,24" fill={color} />
          <circle cx="24" cy="4.5" r="2.2" fill="#f0c054" />
          <rect x="22" y="24" width="4" height="16" rx="1.6" fill={color} opacity="0.7" />
          <path d="M10 26 Q17 20 24 26" stroke={color} strokeWidth="2" fill="none" opacity="0.8" />
          <path d="M38 26 Q31 20 24 26" stroke={color} strokeWidth="2" fill="none" opacity="0.8" />
          <circle cx="24" cy="34" r="3" fill="#f0c054" />
        </>
      );
    case "royalChampion":
      return (
        <>
          <path d="M24 8 L36 13 V24 Q36 34 24 40 Q12 34 12 24 V13Z" fill={color} opacity="0.85" />
          <path d="M24 13 L31 16 V24 Q31 30 24 34" fill="#0c1720" opacity="0.5" />
          <polygon points="18,10 24,4 30,10 24,13" fill="#f0c054" />
        </>
      );
    case "minionPrince":
      return (
        <>
          <polygon points="6,20 18,16 15,30" fill={color} opacity="0.65" />
          <polygon points="42,20 30,16 33,30" fill={color} opacity="0.65" />
          <circle cx="24" cy="24" r="10" fill={color} />
          <polygon points="16,16 20,8 24,14 28,8 32,16 24,19" fill="#f0c054" />
          <circle cx="21" cy="25" r="1.6" fill="#1a202c" />
          <circle cx="27" cy="25" r="1.6" fill="#1a202c" />
        </>
      );
    case "scout":
      return (
        <>
          <rect x="8" y="10" width="26" height="20" rx="2.5" fill={color} opacity="0.35" />
          <line x1="14" y1="16" x2="24" y2="16" stroke={color} strokeWidth="2" />
          <line x1="14" y1="21" x2="28" y2="21" stroke={color} strokeWidth="2" />
          <line x1="14" y1="26" x2="20" y2="26" stroke={color} strokeWidth="2" />
          <circle cx="31" cy="29" r="7" fill="none" stroke={color} strokeWidth="3" />
          <line x1="36" y1="34" x2="42" y2="40" stroke={color} strokeWidth="3.4" strokeLinecap="round" />
        </>
      );
    case "cheapTroop":
      return (
        <>
          <circle cx="10" cy="34" r="2.6" fill={color} opacity="0.5" />
          <circle cx="18" cy="27" r="2.6" fill={color} opacity="0.7" />
          <circle cx="27" cy="21" r="2.8" fill={color} />
          <path d="M10 34 Q16 30 18 27 Q23 24 27 21" stroke={color} strokeWidth="1.6" strokeDasharray="2 3" fill="none" opacity="0.6" />
          <polygon points="34,9 39,20 29,20" fill="#e66572" />
          <line x1="34" y1="13" x2="34" y2="17" stroke="#0c1720" strokeWidth="1.6" />
          <circle cx="34" cy="18.6" r="0.9" fill="#0c1720" />
        </>
      );
    case "funnel":
      return (
        <>
          <line x1="6" y1="12" x2="19" y2="24" stroke={color} strokeWidth="3" strokeLinecap="round" />
          <line x1="42" y1="12" x2="29" y2="24" stroke={color} strokeWidth="3" strokeLinecap="round" />
          <polygon points="18,24 30,24 24,40" fill={color} opacity="0.8" />
          <polygon points="20,10 24,4 28,10" fill={color} />
        </>
      );
    case "spellOrder":
      return (
        <>
          <rect x="10" y="18" width="8" height="18" rx="2.5" fill="#4dbdd2" />
          <rect x="20" y="12" width="8" height="24" rx="2.5" fill="#eaa845" />
          <rect x="30" y="22" width="8" height="14" rx="2.5" fill="#e66572" />
          <text x="14" y="15" fontSize="7" fontWeight="900" fill="#4dbdd2">1</text>
          <text x="24" y="10" fontSize="7" fontWeight="900" fill="#eaa845">2</text>
          <text x="34" y="20" fontSize="7" fontWeight="900" fill="#e66572">3</text>
        </>
      );
    case "heroAbility":
      return (
        <>
          <polygon
            points="24,4 28,17 42,17 30,26 34,40 24,31 14,40 18,26 6,17 20,17"
            fill={color}
          />
          <circle cx="24" cy="22" r="6" fill="#1a202c" opacity="0.3" />
        </>
      );
    case "ccLure":
      return (
        <>
          <rect x="8" y="20" width="14" height="18" rx="2" fill={color} opacity="0.5" />
          <polygon points="15,10 22,20 8,20" fill={color} />
          <rect x="13" y="26" width="4" height="6" fill="#1a202c" opacity="0.5" />
          <circle cx="34" cy="30" r="5" fill="#f0c054" />
          <path d="M22 30 Q28 24 29 30" stroke={color} strokeWidth="1.6" strokeDasharray="2 2" fill="none" />
        </>
      );
    case "compartments":
      return (
        <>
          <rect x="6" y="6" width="36" height="36" rx="2" fill="none" stroke={color} strokeWidth="2.4" />
          <line x1="24" y1="6" x2="24" y2="42" stroke={color} strokeWidth="2.4" />
          <line x1="6" y1="24" x2="42" y2="24" stroke={color} strokeWidth="2.4" />
          <circle cx="15" cy="15" r="2.2" fill="#f0c054" />
          <circle cx="33" cy="33" r="2.2" fill="#f0c054" />
        </>
      );
    case "layeredCore":
      return (
        <>
          <rect x="4" y="4" width="40" height="40" rx="4" fill="none" stroke={color} strokeWidth="2.2" opacity="0.4" />
          <rect x="11" y="11" width="26" height="26" rx="3" fill="none" stroke={color} strokeWidth="2.2" opacity="0.7" />
          <rect x="18" y="18" width="12" height="12" rx="2" fill={color} />
        </>
      );
    case "decoyStorage":
      return (
        <>
          <ellipse cx="12" cy="34" rx="8" ry="3" fill={color} opacity="0.5" />
          <rect x="6" y="24" width="12" height="10" rx="1.5" fill={color} />
          <ellipse cx="12" cy="24" rx="6" ry="2.4" fill="#fde5a5" />
          <path d="M20 30 L36 18" stroke={color} strokeWidth="1.6" strokeDasharray="2 3" />
          <path d="M24 24 Q30 20 36 18" fill="none" />
          <polygon points="34,10 44,10 39,20" fill={color} opacity="0.8" />
        </>
      );
    case "airCoverage":
      return (
        <>
          <circle cx="24" cy="24" r="18" fill="none" stroke={color} strokeWidth="1.6" opacity="0.3" />
          <circle cx="24" cy="24" r="11" fill="none" stroke={color} strokeWidth="1.6" opacity="0.55" />
          <circle cx="24" cy="24" r="3.4" fill={color} />
          <polygon points="12,10 18,14 8,18" fill="#e66572" />
          <polygon points="38,34 32,32 40,26" fill="#e66572" />
        </>
      );
    case "trapPlacement":
      return (
        <>
          <rect x="6" y="30" width="36" height="4" rx="2" fill={color} opacity="0.35" />
          <polygon points="24,8 34,30 14,30" fill={color} />
          <rect x="21" y="16" width="6" height="10" fill="#1a202c" opacity="0.4" />
          <line x1="18" y1="34" x2="18" y2="40" stroke={color} strokeWidth="2" strokeDasharray="1.5 2" />
          <line x1="30" y1="34" x2="30" y2="40" stroke={color} strokeWidth="2" strokeDasharray="1.5 2" />
        </>
      );
    case "plannerCheck":
      return (
        <>
          <rect x="10" y="6" width="28" height="36" rx="3" fill="none" stroke={color} strokeWidth="2.2" />
          <line x1="16" y1="16" x2="32" y2="16" stroke={color} strokeWidth="2" opacity="0.6" />
          <line x1="16" y1="23" x2="32" y2="23" stroke={color} strokeWidth="2" opacity="0.6" />
          <path d="M16 31 L21 36 L32 25" stroke="#f0c054" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    default:
      return null;
  }
}

export function GuideIcon({
  id,
  size = 40,
  style,
  className,
}: {
  id: GuideIconId;
  size?: number;
  style?: CSSProperties;
  className?: string;
}) {
  const color = ICON_COLORS[id];
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      style={style}
      aria-hidden="true"
    >
      <rect x="0" y="0" width="48" height="48" rx="11" fill={color} opacity="0.12" />
      <Glyph id={id} color={color} />
    </svg>
  );
}
