import type { Player } from "../types";
import { type UpgradeItem, upgradeSources, type UpgradeLane } from "../upgradeData";
import { emptyCosts, addCosts } from "./formatters";

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
  if (playstyle === "rush" && (item.kind === "defense" || item.kind === "trap")) return "Bỏ qua phòng thủ vì bạn chọn lối chơi tấn công trước.";
  if (playstyle === "defense" && (item.kind === "hero" || item.kind === "troop" || item.kind === "spell" || item.kind === "siege" || item.kind === "equipment" || item.kind === "pet")) return "Ưu tiên giảm đi vì bạn chọn lối chơi phòng thủ trước.";
  if (playstyle === "rush-hall" && (item.kind === "defense" || item.kind === "trap" || item.kind === "building")) return "Chỉ tập trung tối đa quân và hero để đẩy Town Hall.";
  const atk = attackStyleOfTroop(item);
  if (atk && atk === attackFocus) return `Bạn chọn đội hình ${atk === "air" ? "trên không" : "mặt đất"} nên lính này được cộng điểm cao.`;
  if (atk && atk !== attackFocus && attackFocus !== "both") return `Quân lính này không hợp đội hình ${attackFocus === "air" ? "trên không" : "mặt đất"} bạn đang dùng.`;
  const def = defenseFocusOf(item);
  if (def && def === defenseFocus) return `Bạn tập trung chống ${defenseFocus === "air" ? "trên không" : "mặt đất"} nên công trình này được ưu tiên.`;
  return null;
}

export function manualKey(player: Player | null, item: UpgradeItem) {
  return `${player ? player.tag : "guest"}-${item.id}`;
}

export function readStoredChoice<T extends string>(key: string, allowed: T[], fallback: T): T {
  const v = localStorage.getItem(key) as T;
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

export function summarizePlan(item: UpgradeItem, currentLevel: number, targetLevel: number, quantity = 1) {
  const steps = item.levels.filter(x => x.level > currentLevel && x.level <= targetLevel);
  const costs = emptyCosts();
  for (const step of steps) costs[step.resource] = (costs[step.resource] || 0) + step.cost * quantity;
  return {
    steps,
    costs,
    totalHours: steps.reduce((sum, step) => sum + step.timeHours * quantity, 0),
    requiredTownHall: steps.length ? Math.max(...steps.map(x => x.townHall)) : 0,
    requires: steps.length ? Array.from(new Set(steps.flatMap(x => x.requires || []))) : []
  };
}

export function targetForTownHall(item: UpgradeItem, townHall: number) {
  for (let lvl = item.levels.length; lvl >= 1; lvl--) {
    if (item.levels[lvl - 1].townHall <= townHall) return lvl;
  }
  return 0;
}

export function lockNoteFor(item: UpgradeItem, playerTownHall: number) {
  if (playerTownHall >= item.unlockTownHall) return null;
  return `Cần Town Hall ${item.unlockTownHall}`;
}

export function phaseFor(item: UpgradeItem) {
  const lane = item.lane;
  if (lane === "Blacksmith" || lane === "Pet House") return "Trang bị/Pet";
  if (item.kind === "hero") return "Hero";
  if (lane === "Laboratory") return "Farm/đội đánh";
  if (item.kind === "defense" || item.kind === "trap") return "Phòng thủ";
  if (item.kind === "building" && item.id.includes("storage")) return "Mở khóa";
  if (item.id === "laboratory" || item.id === "clan-castle" || item.id === "pet-house" || item.id === "blacksmith" || item.id === "army-camp") return "Mở khóa";
  return "Khác";
}

export function priorityFor(item: UpgradeItem): { score: number, reason: string } {
  if (item.id === "laboratory") return { score: 1000, reason: "Bắt buộc mở sớm để nâng cấp quân/phép cho các trận đánh và clan war." };
  if (item.id === "clan-castle") return { score: 990, reason: "Tăng sức chứa xin lính/phép/máy từ Clan, cực kỳ quan trọng." };
  if (item.id === "army-camp") return { score: 980, reason: "Tăng trực tiếp số lượng lính mang đi đánh." };
  if (item.id === "pet-house" || item.id === "blacksmith") return { score: 970, reason: "Mở khóa công cụ mạnh mẽ: Pet hỗ trợ Hero và kỹ năng Trang bị mới." };
  if (item.id.includes("storage")) return { score: 950, reason: "Nâng max kho để đủ tài nguyên chứa nâng cấp các công trình lớn khác." };
  if (item.kind === "hero") return { score: 900, reason: "Sức mạnh nòng cốt của làng. (Mẹo: Cố giữ cho ít nhất 1-2 hero ngủ liên tục)." };
  if (item.lane === "Laboratory") {
    if (item.kind === "spell") return { score: 850, reason: "Phép là chìa khóa chiến thắng. Hưu tiên nâng những phép bạn hay dùng nhất." };
    if (item.kind === "troop") return { score: 800, reason: "Quân mạnh giúp farm và war tốt. Tập trung nâng quân chính trong đội hình trước." };
    return { score: 750, reason: "Nâng cấp khi rảnh." };
  }
  if (item.lane === "Blacksmith") return { score: 880, reason: "Trang bị Hero ảnh hưởng rất lớn đến sát thương và khả năng sống sót." };
  if (item.lane === "Pet House") return { score: 820, reason: "Cộng dồn đáng kể sức mạnh cho Hero đi kèm." };
  if (item.id === "eagle-artillery" || item.id === "scattershot" || item.id === "monolith") return { score: 700, reason: "Phòng thủ chủ lực hạng nặng. (Cẩn thận: war weight cao)." };
  if (item.id === "inferno-tower" || item.id === "x-bow") return { score: 650, reason: "Phòng thủ tuyến giữa quan trọng, sát thương lớn." };
  if (item.id === "air-defense") return { score: 600, reason: "Rất quan trọng để chặn chiến thuật xả Rồng bay diện rộng." };
  if (item.kind === "defense") return { score: 500, reason: "Phòng thủ cơ bản (Archer Tower, Cannon, ...)." };
  if (item.kind === "trap") return { score: 400, reason: "Bẫy nên nâng cuối khi đã max phòng thủ chính để tối ưu thời gian thợ." };
  return { score: 300, reason: "Công trình kinh tế/phụ, nâng cấp khi thừa thợ hoặc chuẩn bị lên Town Hall." };
}

export const playstyleHint: Record<Playstyle, string> = {
  "rush": "Gợi ý ưu tiên quân đội, phép thuật và hero để tấn công hiệu quả nhất, đẩy nhanh lên Town Hall.",
  "balanced": "Gợi ý cân bằng giữa phòng thủ và tấn công. Ưu tiên các mục tiêu quan trọng trước.",
  "defense": "Gợi ý tập trung tối đa vào phòng thủ, bẫy và tường. Phù hợp nếu bạn muốn phòng thủ chắc chắn.",
  "rush-hall": "Gợi ý chỉ tập trung vào quân, hero để liên tục đẩy cấp Town Hall, gần như bỏ qua phòng thủ."
};
