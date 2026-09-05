import type { Player } from "../types";
import { type UpgradeItem, upgradeSources, type UpgradeLane } from "../upgradeData";
import { emptyCosts, addCosts } from "./formatters";
import { vi } from "../i18n/locales/vi";

function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}

export const trackerKindOrder: UpgradeItem["kind"][] = ["building", "defense", "trap", "hero", "troop", "spell", "siege", "equipment", "pet"];

export type Playstyle = "rush" | "balanced" | "defense" | "rush-hall";
export type StyleFocus = "ground" | "air" | "both";

const airTroopNames = new Set(["Balloon", "Dragon", "Baby Dragon", "Electro Dragon", "Dragon Rider", "Minion", "Lava Hound", "Healer"]);
const attackStyleOfTroop = (item: UpgradeItem): "ground" | "air" | null => item.kind === "troop" ? (airTroopNames.has(item.name) ? "air" : "ground") : null;

const groundOnlyDefenseIds = new Set(["cannon", "mortar", "ricochet-cannon"]);
const airOnlyDefenseIds = new Set(["air-defense", "air-sweeper"]);
const groundOnlyTrapIds = new Set(["bomb", "spring-trap", "giant-bomb", "skeleton-trap", "giga-bomb"]);
const airOnlyTrapIds = new Set(["air-bomb", "seeking-air-mine", "tornado-trap"]);
const defenseFocusOf = (item: UpgradeItem): "ground" | "air" | "both" | null => {
  if (item.kind !== "defense" && item.kind !== "trap") return null;
  if (groundOnlyDefenseIds.has(item.id) || groundOnlyTrapIds.has(item.id)) return "ground";
  if (airOnlyDefenseIds.has(item.id) || airOnlyTrapIds.has(item.id)) return "air";
  return "both";
};

export function styleScoreFor(item: UpgradeItem, baseScore: number, playstyle: Playstyle, attackFocus: StyleFocus, defenseFocus: StyleFocus) {
  let score = baseScore;
  const isArmyLane = item.kind === "hero" || item.kind === "troop" || item.kind === "spell" || item.kind === "siege" || item.kind === "equipment" || item.kind === "pet";
  const isDefenseLane = item.kind === "defense" || item.kind === "trap";
  if (playstyle === "rush") { if (isDefenseLane) score *= 0.55; else if (isArmyLane) score *= 1.3; }
  if (playstyle === "defense") { if (isDefenseLane) score *= 1.4; else if (isArmyLane) score *= 0.8; }
  if (playstyle === "rush-hall") { if (isDefenseLane) score *= 0.2; else if (item.kind === "building") score *= 0.9; else if (isArmyLane) score *= 1.5; }
  if (attackFocus !== "both") {
    const atk = attackStyleOfTroop(item);
    if (atk === attackFocus) score *= 1.35;
    else if (atk && atk !== attackFocus) score *= 0.75;
  }
  if (defenseFocus !== "both") {
    const def = defenseFocusOf(item);
    if (def === defenseFocus) score *= 1.3;
    else if (def && def !== defenseFocus && def !== "both") score *= 0.75;
  }
  return score;
}

export function styleReasonFor(item: UpgradeItem, playstyle: Playstyle, attackFocus: StyleFocus, defenseFocus: StyleFocus) {
  const R = vi.upgradeLogic.styleReasons;
  if (playstyle === "rush" && (item.kind === "defense" || item.kind === "trap")) return R.rushSkipDefense;
  if (playstyle === "defense" && (item.kind === "hero" || item.kind === "troop" || item.kind === "spell" || item.kind === "siege" || item.kind === "equipment" || item.kind === "pet")) return R.defenseDeprioritizeArmy;
  if (playstyle === "rush-hall" && (item.kind === "defense" || item.kind === "trap" || item.kind === "building")) return R.rushHallFocusArmy;
  const atk = attackStyleOfTroop(item);
  if (atk && atk === attackFocus) return fmt(R.attackFocusMatch, { focus: atk === "air" ? R.focusAir : R.focusGroundAlt });
  if (atk && atk !== attackFocus && attackFocus !== "both") return fmt(R.attackFocusMismatch, { focus: attackFocus === "air" ? R.focusAir : R.focusGroundAlt });
  const def = defenseFocusOf(item);
  if (def && def === defenseFocus) return fmt(R.defenseFocusMatch, { focus: defenseFocus === "air" ? R.focusAir : R.focusGroundAlt });
  return null;
}

export function manualKey(player: Player | null, item: UpgradeItem) {
  return `${player ? player.tag : "guest"}-${item.id}`;
}

export function readStoredChoice<T extends string>(key: string, allowed: T[], fallback: T): T {
  const v = localStorage.getItem(key) as T;
  return allowed.includes(v) ? v : fallback;
}

export function readStoredNumber(key: string, allowed: number[], fallback: number): number {
  const v = parseInt(localStorage.getItem(key) || "", 10);
  return allowed.includes(v) ? v : fallback;
}

export function currentLevelFor(item: UpgradeItem, player: Player | null, manualLevels: Record<string, number>) {
  if (item.id === "town-hall") return player?.townHallLevel || 0;
  if (!item.apiTracked) return manualLevels[manualKey(player, item)] || 0;
  if (!player) return 0;
  const pools = [
    ...(player.heroes || []),
    ...(player.troops || []),
    ...(player.spells || []),
    ...(player.heroEquipment || [])
  ];
  return pools.find(x => x.name === item.name)?.level || 0;
}

export function summarizePlan(item: UpgradeItem, currentLevel: number, targetLevel: number, quantity = 1, goldPassDiscount = 0) {
  const steps = item.levels.filter(x => x.level > currentLevel && x.level <= targetLevel);
  const costs = emptyCosts();
  let totalHours = 0;
  
  const discountMultiplier = 1 - (goldPassDiscount / 100);

  for (const step of steps) {
    // Discount does not apply to Ores (Shiny, Glowy, Starry) for Equipment.
    // It usually applies to Builder time/cost, Lab time/cost, and Pet House time/cost.
    const isOre = step.resource === "Shiny Ore" || step.resource === "Glowy Ore" || step.resource === "Starry Ore";
    
    // Some costs are Instant or small, but we'll apply generally unless it's ore.
    const actualCost = isOre ? step.cost : Math.ceil(step.cost * discountMultiplier);
    const actualHours = step.timeHours * discountMultiplier;
    
    costs[step.resource] = (costs[step.resource] || 0) + actualCost * quantity;
    totalHours += actualHours * quantity;
  }
  
  return {
    steps,
    costs,
    totalHours,
    requiredTownHall: steps.length ? Math.max(...steps.map(x => x.townHall)) : 0,
    requires: steps.length ? Array.from(new Set(steps.flatMap(x => x.requires || []))) : []
  };
}

export function targetForTownHall(item: UpgradeItem, townHall: number) {
  for (let lvl = item.levels.length; lvl >= 1; lvl--) {
    if (item.levels[lvl - 1].townHall <= townHall) return item.levels[lvl - 1].level;
  }
  return 0;
}

export function lockNoteFor(item: UpgradeItem, playerTownHall: number) {
  if (playerTownHall >= item.unlockTownHall) return null;
  return fmt(vi.upgradeLogic.unlockNote, { th: item.unlockTownHall });
}

export type UpgradePhaseKey = "unlock" | "farm" | "hero" | "equipment" | "defense" | "other";

export function phaseFor(item: UpgradeItem): UpgradePhaseKey {
  const lane = item.lane;
  if (lane === "Blacksmith" || lane === "Pet House") return "equipment";
  if (item.kind === "hero") return "hero";
  if (lane === "Laboratory") return "farm";
  if (item.kind === "defense" || item.kind === "trap") return "defense";
  if (item.kind === "building" && item.id.includes("storage")) return "unlock";
  if (item.id === "laboratory" || item.id === "clan-castle" || item.id === "pet-house" || item.id === "blacksmith" || item.id === "army-camp") return "unlock";
  return "other";
}

export function priorityFor(item: UpgradeItem): { score: number, reason: string } {
  const R = vi.upgradeLogic.priorityReasons;
  if (item.id === "laboratory") return { score: 1000, reason: R.laboratory };
  if (item.id === "clan-castle") return { score: 990, reason: R.clanCastle };
  if (item.id === "army-camp") return { score: 980, reason: R.armyCamp };
  if (item.id === "pet-house" || item.id === "blacksmith") return { score: 970, reason: R.petHouseOrBlacksmith };
  if (item.id.includes("storage")) return { score: 950, reason: R.storage };
  if (item.kind === "hero") return { score: 900, reason: R.hero };
  if (item.lane === "Laboratory") {
    if (item.kind === "spell") return { score: 850, reason: R.spell };
    if (item.kind === "troop") return { score: 800, reason: R.troop };
    return { score: 750, reason: R.labOther };
  }
  if (item.lane === "Blacksmith") return { score: 880, reason: R.blacksmith };
  if (item.lane === "Pet House") return { score: 820, reason: R.petHouse };
  if (item.id === "eagle-artillery" || item.id === "scattershot" || item.id === "monolith") return { score: 700, reason: R.heavyDefense };
  if (item.id === "inferno-tower" || item.id === "x-bow") return { score: 650, reason: R.midDefense };
  if (item.id === "air-defense") return { score: 600, reason: R.airDefense };
  if (item.kind === "defense") return { score: 500, reason: R.basicDefense };
  if (item.kind === "trap") return { score: 400, reason: R.trap };
  return { score: 300, reason: R.other };
}

export const playstyleHint: Record<Playstyle, string> = {
  "rush": vi.upgradeLogic.playstyleHint.rush,
  "balanced": vi.upgradeLogic.playstyleHint.balanced,
  "defense": vi.upgradeLogic.playstyleHint.defense,
  "rush-hall": vi.upgradeLogic.playstyleHint.rushHall,
};
