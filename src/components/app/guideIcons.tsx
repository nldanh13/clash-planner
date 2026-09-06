/**
 * Original hand-drawn icon illustrations for the "Hướng dẫn" (Guide) tab.
 * Each glyph was designed by looking at real reference art for the unit,
 * building, spell or trap it represents (proportions, silhouette, color
 * palette) and redrawing it as an original, simplified vector illustration
 * — not a trace or a copy of any Supercell asset, and not a hotlinked
 * third-party image. That keeps every icon self-contained: no external
 * network request, nothing that can go missing or break a hotlink later.
 */
import type { CSSProperties } from "react";
import type { GuideIconId } from "../../guideData";

const ICON_COLORS: Record<GuideIconId, string> = {
  golem: "#9aa0a8",
  hogRider: "#c98a4b",
  electroDragon: "#4dbdd2",
  superArcher: "#e0699b",
  superYeti: "#c9d4db",
  dragonDuke: "#e0525f",
  barbarianKing: "#eaa845",
  archerQueen: "#9a7fe0",
  grandWarden: "#8a5fd1",
  royalChampion: "#4d7fd2",
  minionPrince: "#3fbfae",
  scout: "#4dbdd2",
  cheapTroop: "#c98a4b",
  funnel: "#f0c054",
  spellOrder: "#4dbdd2",
  heroAbility: "#f0c054",
  ccLure: "#7c6fd6",
  compartments: "#5fc887",
  layeredCore: "#4dbdd2",
  decoyStorage: "#e0b23c",
  airCoverage: "#e0b23c",
  trapPlacement: "#a9743f",
  plannerCheck: "#5fc887",
};

function Glyph({ id }: { id: GuideIconId }) {
  switch (id) {
    case "golem":
      return (
        <>
          <path d="M15 8 Q24 3 33 8 L34 19 Q24 24 14 19Z" fill="#8f959c" />
          <rect x="9" y="18" width="30" height="20" rx="6" fill="#787f87" />
          <rect x="3" y="21" width="8" height="13" rx="3" fill="#666d75" />
          <rect x="37" y="21" width="8" height="13" rx="3" fill="#666d75" />
          <path d="M9 22 l4 3 -4 3Z" fill="#5c636b" />
          <path d="M39 22 l-4 3 4 3Z" fill="#5c636b" />
          <circle cx="19" cy="15" r="2.6" fill="#e26fd6" />
          <circle cx="29" cy="15" r="2.6" fill="#e26fd6" />
          <circle cx="19" cy="15" r="1" fill="#fbdcf5" />
          <circle cx="29" cy="15" r="1" fill="#fbdcf5" />
        </>
      );
    case "hogRider":
      return (
        <>
          <ellipse cx="22" cy="32" rx="16" ry="8" fill="#c98a4b" />
          <circle cx="9" cy="28" r="6" fill="#c98a4b" />
          <path d="M4 26 q5 -4 8 0" stroke="#a06a33" strokeWidth="1.6" fill="none" />
          <circle cx="6.5" cy="27" r="1.1" fill="#3a2417" />
          <circle cx="26" cy="15" r="6" fill="#8a5a3a" />
          <path d="M22 10 Q26 4 30 10" fill="#1a1a1a" />
          <path d="M21 19 Q26 24 31 19 L30 22 Q26 25 22 22Z" fill="#141414" />
          <rect x="22" y="20" width="8" height="11" rx="3" fill="#6b4423" />
          <rect x="33" y="10" width="3.4" height="16" rx="1.4" fill="#c9d4db" transform="rotate(30 33 10)" />
          <rect x="35.5" y="8" width="6" height="4.5" rx="1" fill="#8a6a4a" transform="rotate(30 35.5 8)" />
        </>
      );
    case "electroDragon":
      return (
        <>
          <polygon points="9,27 21,13 21,35" fill="#3a9fb5" />
          <polygon points="39,27 27,13 27,35" fill="#3a9fb5" />
          <ellipse cx="24" cy="29" rx="14" ry="8" fill="#4dbdd2" />
          <ellipse cx="24" cy="32" rx="9" ry="4" fill="#eaf7fa" opacity="0.85" />
          <circle cx="35" cy="20" r="5.5" fill="#4dbdd2" />
          <polygon points="33,14 35,8 37,14" fill="#cdeef4" />
          <path d="M30 21 Q35 22 36 26 Q33 27 30 24Z" fill="#0c1720" />
          <polygon points="31,22 34,24 31.5,25" fill="#fff" />
          <polygon points="18,19 15,28 19,28 16,35 25,24 20,24" fill="#f0c054" />
        </>
      );
    case "superArcher":
      return (
        <>
          <circle cx="20" cy="16" r="8" fill="#f3c9a8" />
          <path d="M11 13 Q20 2 29 13 Q26 10 20 11 Q14 10 11 13Z" fill="#e0699b" />
          <path d="M10 16 Q9 26 13 30" stroke="#e0699b" strokeWidth="4" fill="none" strokeLinecap="round" />
          <rect x="14" y="13" width="12" height="4" rx="1.5" fill="#f0c054" />
          <rect x="16" y="22" width="9" height="14" rx="3" fill="#3a5a4a" />
          <path d="M33 8 Q42 21 33 34" stroke="#5fc887" strokeWidth="2.2" fill="none" />
          <line x1="33" y1="8" x2="33" y2="34" stroke="#5fc887" strokeWidth="1.2" opacity="0.6" />
          <line x1="14" y1="30" x2="35" y2="14" stroke="#eaf7ea" strokeWidth="1.6" />
        </>
      );
    case "superYeti":
      return (
        <>
          <circle cx="24" cy="27" r="14" fill="#dfe8ee" />
          <polygon points="14,17 18,8 21,18" fill="#dfe8ee" />
          <polygon points="21,14 25,5 28,15" fill="#dfe8ee" />
          <polygon points="29,17 33,8 35,18" fill="#dfe8ee" />
          <path d="M15 24 Q24 20 33 24" stroke="#1a202c" strokeWidth="1.8" fill="none" />
          <circle cx="19" cy="27" r="2.1" fill="#1a202c" />
          <circle cx="29" cy="27" r="2.1" fill="#1a202c" />
          <path d="M16 33 Q24 40 32 33 Q31 38 24 39 Q17 38 16 33Z" fill="#0c1720" />
          <polygon points="19,33 21,36 23,33" fill="#fff" />
          <polygon points="25,33 27,36 29,33" fill="#fff" />
        </>
      );
    case "dragonDuke":
      return (
        <>
          <polygon points="7,29 18,15 18,35" fill="#b53f4a" />
          <polygon points="41,29 30,15 30,35" fill="#b53f4a" />
          <path d="M16 30 Q24 10 32 30 Q32 38 24 41 Q16 38 16 30Z" fill="#e0525f" />
          <polygon points="18,13 21,4 23,12 25,4 27,4 29,12 31,4 33,13" fill="#ecdcb3" />
          <path d="M17 31 Q24 37 31 31 L30 34 Q24 39 18 34Z" fill="#0c1720" />
          <polygon points="19,31 21,34 23,31.5" fill="#fff" />
          <polygon points="25,31.5 27,34 29,31" fill="#fff" />
          <circle cx="20" cy="23" r="1.7" fill="#1a202c" />
          <circle cx="28" cy="23" r="1.7" fill="#1a202c" />
        </>
      );
    case "barbarianKing":
      return (
        <>
          <circle cx="24" cy="21" r="10" fill="#e6b98a" />
          <path
            d="M12 23 Q17 21 20 25 Q24 32 28 25 Q31 21 36 23 Q35 34 24 37 Q13 34 12 23Z"
            fill="#d9a441"
          />
          <path d="M16 22 Q24 27 32 22" stroke="#b5842f" strokeWidth="1.2" fill="none" opacity="0.5" />
          <polygon points="14,15 19,6 24,12 29,6 34,15 24,18" fill="#f0c054" />
          <rect x="18" y="12" width="2.4" height="2.4" fill="#e0525f" />
          <rect x="27.6" y="12" width="2.4" height="2.4" fill="#4d7fd2" />
          <rect x="35" y="27" width="3" height="14" rx="1.3" fill="#c9d4db" transform="rotate(24 35 27)" />
        </>
      );
    case "archerQueen":
      return (
        <>
          <path d="M12 18 Q13 34 17 38 L31 38 Q35 34 36 18 Q35 8 24 8 Q13 8 12 18Z" fill="#9a7fe0" />
          <circle cx="24" cy="20" r="9" fill="#f3c9a8" />
          <path d="M14 16 Q24 6 34 16 Q30 13 24 13.5 Q18 13 14 16Z" fill="#8a6ad0" />
          <polygon points="16,12 21,5 24,11 27,5 32,12 24,15" fill="#f0c054" />
          <circle cx="21" cy="20" r="1.3" fill="#3a5a99" />
          <circle cx="27" cy="20" r="1.3" fill="#3a5a99" />
          <path d="M36 13 Q44 24 36 38" stroke="#5fc887" strokeWidth="2.2" fill="none" />
          <line x1="36" y1="13" x2="36" y2="38" stroke="#5fc887" strokeWidth="1.1" opacity="0.6" />
        </>
      );
    case "grandWarden":
      return (
        <>
          <path d="M14 26 Q12 12 24 6 Q36 12 34 26 Z" fill="#8a5fd1" />
          <path d="M18 26 Q17 15 24 11 Q31 15 30 26Z" fill="#7148c2" />
          <circle cx="24" cy="6" r="2.3" fill="#f0c054" />
          <rect x="21" y="26" width="6" height="14" rx="2" fill="#8a5fd1" />
          <path d="M9 27 Q17 20 24 27" stroke="#f0c054" strokeWidth="2" fill="none" opacity="0.9" />
          <path d="M39 27 Q31 20 24 27" stroke="#f0c054" strokeWidth="2" fill="none" opacity="0.9" />
          <circle cx="24" cy="34" r="3.2" fill="#f0c054" />
          <circle cx="24" cy="34" r="1.3" fill="#fff6df" />
        </>
      );
    case "royalChampion":
      return (
        <>
          <path d="M14 20 Q13 34 18 39 L30 39 Q35 34 34 20 Q34 9 24 9 Q14 9 14 20Z" fill="#4d7fd2" />
          <circle cx="24" cy="21" r="8.5" fill="#e6b98a" />
          <path d="M13 17 Q24 6 35 17 Q29 12 24 12.5 Q19 12 13 17Z" fill="#3a5fb0" />
          <polygon points="15,20 24,13 33,20 27,21 24,27 21,21" fill="#f0c054" />
          <circle cx="21" cy="20.5" r="1.6" fill="#e8f0ff" />
          <circle cx="27" cy="20.5" r="1.6" fill="#e8f0ff" />
        </>
      );
    case "minionPrince":
      return (
        <>
          <polygon points="6,19 18,15 15,29" fill="#2f9a8c" opacity="0.85" />
          <polygon points="42,19 30,15 33,29" fill="#2f9a8c" opacity="0.85" />
          <circle cx="24" cy="24" r="10" fill="#3fbfae" />
          <path d="M15 20 Q24 24 33 20 L30 16 Q24 19 18 16Z" fill="#12241f" />
          <polygon points="17,15 20,7 24,13 28,7 31,15 24,18" fill="#12241f" />
          <circle cx="21" cy="25" r="1.7" fill="#0c1720" />
          <circle cx="27" cy="25" r="1.7" fill="#0c1720" />
          <path d="M20 30 Q24 33 28 30" stroke="#0c1720" strokeWidth="1.4" fill="none" />
          <polygon points="19.5,30.5 21,33 22,30.8" fill="#fff" />
        </>
      );
    case "scout":
      return (
        <>
          <rect x="8" y="10" width="26" height="20" rx="2.5" fill="currentColor" opacity="0.3" />
          <line x1="14" y1="16" x2="24" y2="16" stroke="currentColor" strokeWidth="2" />
          <line x1="14" y1="21" x2="28" y2="21" stroke="currentColor" strokeWidth="2" />
          <line x1="14" y1="26" x2="20" y2="26" stroke="currentColor" strokeWidth="2" />
          <circle cx="31" cy="29" r="7" fill="none" stroke="currentColor" strokeWidth="3" />
          <line x1="36" y1="34" x2="42" y2="40" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
        </>
      );
    case "cheapTroop":
      return (
        <>
          <circle cx="24" cy="26" r="12" fill="#e6b98a" />
          <path d="M13 24 Q13 10 24 8 Q35 10 35 24 Q29 20 24 21 Q19 20 13 24Z" fill="#4a2f1c" />
          <path d="M14 30 Q24 40 34 30 L32 34 Q24 42 16 34Z" fill="#3a2415" />
          <circle cx="20" cy="27" r="1.7" fill="#241608" />
          <circle cx="28" cy="27" r="1.7" fill="#241608" />
          <rect x="10" y="34" width="28" height="6" rx="2" fill="#8a6a4a" />
        </>
      );
    case "funnel":
      return (
        <>
          <line x1="6" y1="12" x2="19" y2="24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <line x1="42" y1="12" x2="29" y2="24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <polygon points="18,24 30,24 24,40" fill="currentColor" opacity="0.85" />
          <polygon points="20,10 24,4 28,10" fill="currentColor" />
        </>
      );
    case "spellOrder":
      return (
        <>
          <polygon points="24,4 36,18 24,44 12,18" fill="#3a9fb5" />
          <polygon points="24,4 36,18 24,24" fill="#6fd4e8" />
          <polygon points="24,4 12,18 24,24" fill="#4dbdd2" />
          <polygon points="12,18 24,44 24,24" fill="#2a7f93" />
          <polygon points="36,18 24,44 24,24" fill="#3a9fb5" />
          <polygon points="20,14 24,10 28,14 24,18" fill="#eaf9fc" opacity="0.85" />
        </>
      );
    case "heroAbility":
      return (
        <>
          <polygon
            points="24,4 28,17 42,17 30,26 34,40 24,31 14,40 18,26 6,17 20,17"
            fill="currentColor"
          />
          <circle cx="24" cy="22" r="6" fill="#1a202c" opacity="0.3" />
        </>
      );
    case "ccLure":
      return (
        <>
          <rect x="9" y="20" width="30" height="18" rx="2" fill="#5b4fa8" />
          <rect x="9" y="20" width="30" height="4" fill="#3f3580" />
          <rect x="9" y="14" width="6" height="8" fill="#5b4fa8" />
          <rect x="21" y="10" width="6" height="12" fill="#6a5cc0" />
          <rect x="33" y="14" width="6" height="8" fill="#5b4fa8" />
          <rect x="9" y="12" width="6" height="4" fill="#7a6cd0" />
          <rect x="21" y="8" width="6" height="4" fill="#7a6cd0" />
          <rect x="33" y="12" width="6" height="4" fill="#7a6cd0" />
          <circle cx="24" cy="30" r="4" fill="#f0c054" />
          <rect x="16" y="32" width="4" height="6" fill="#2f2760" />
          <rect x="28" y="32" width="4" height="6" fill="#2f2760" />
        </>
      );
    case "compartments":
      return (
        <>
          <rect x="6" y="6" width="36" height="36" rx="2" fill="none" stroke="currentColor" strokeWidth="2.4" />
          <line x1="24" y1="6" x2="24" y2="42" stroke="currentColor" strokeWidth="2.4" />
          <line x1="6" y1="24" x2="42" y2="24" stroke="currentColor" strokeWidth="2.4" />
          <circle cx="15" cy="15" r="2.2" fill="#f0c054" />
          <circle cx="33" cy="33" r="2.2" fill="#f0c054" />
        </>
      );
    case "layeredCore":
      return (
        <>
          <rect x="4" y="4" width="40" height="40" rx="4" fill="none" stroke="currentColor" strokeWidth="2.2" opacity="0.4" />
          <rect x="11" y="11" width="26" height="26" rx="3" fill="none" stroke="currentColor" strokeWidth="2.2" opacity="0.7" />
          <rect x="18" y="18" width="12" height="12" rx="2" fill="currentColor" />
        </>
      );
    case "decoyStorage":
      return (
        <>
          <path d="M9 22 L14 15 L34 15 L39 22 L39 37 Q39 40 36 40 L12 40 Q9 40 9 37Z" fill="#8a9098" />
          <polygon points="14,15 12,9 17,11" fill="#6f757c" />
          <polygon points="34,15 36,9 31,11" fill="#6f757c" />
          <polygon points="24,15 22,7 27,9" fill="#6f757c" />
          <ellipse cx="24" cy="24" rx="12" ry="5.5" fill="#f0c054" />
          <ellipse cx="24" cy="22" rx="9" ry="4" fill="#ffe08a" />
          <circle cx="18" cy="22" r="2.2" fill="#f6d475" />
          <circle cx="27" cy="21" r="2.2" fill="#f6d475" />
          <circle cx="31" cy="23" r="2.2" fill="#f6d475" />
        </>
      );
    case "airCoverage":
      return (
        <>
          <circle cx="24" cy="24" r="7" fill="#8a9098" />
          <rect x="21" y="4" width="6" height="14" rx="2.5" fill="#e0b23c" />
          <rect x="21" y="30" width="6" height="14" rx="2.5" fill="#e0b23c" />
          <rect x="4" y="21" width="14" height="6" rx="2.5" fill="#e0b23c" />
          <rect x="30" y="21" width="14" height="6" rx="2.5" fill="#e0b23c" />
          <circle cx="24" cy="11" r="3" fill="#1a1a1a" />
          <circle cx="24" cy="37" r="3" fill="#1a1a1a" />
          <circle cx="11" cy="24" r="3" fill="#1a1a1a" />
          <circle cx="37" cy="24" r="3" fill="#1a1a1a" />
          <circle cx="24" cy="24" r="3.4" fill="#3a3f45" />
        </>
      );
    case "trapPlacement":
      return (
        <>
          <rect x="7" y="17" width="13" height="20" rx="5" fill="#a9743f" />
          <rect x="18" y="14" width="13" height="24" rx="5" fill="#8a5f30" />
          <rect x="29" y="17" width="13" height="20" rx="5" fill="#a9743f" />
          <rect x="6" y="24" width="37" height="4" fill="#5c3f1f" />
          <rect x="6" y="30" width="37" height="4" fill="#5c3f1f" />
          <rect x="22" y="8" width="4" height="7" rx="1.5" fill="#3a2812" />
          <circle cx="24" cy="7" r="2.2" fill="#e0525f" />
        </>
      );
    case "plannerCheck":
      return (
        <>
          <rect x="10" y="6" width="28" height="36" rx="3" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <line x1="16" y1="16" x2="32" y2="16" stroke="currentColor" strokeWidth="2" opacity="0.6" />
          <line x1="16" y1="23" x2="32" y2="23" stroke="currentColor" strokeWidth="2" opacity="0.6" />
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
      style={{ color, ...style }}
      aria-hidden="true"
    >
      <rect x="0" y="0" width="48" height="48" rx="11" fill={color} opacity="0.14" />
      <Glyph id={id} />
    </svg>
  );
}
