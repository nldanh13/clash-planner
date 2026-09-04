import type { Player } from "../types";
import { type UpgradeItem, type UpgradeLevel, type Resource, upgradeItems } from "../upgradeData";
import { currentLevelFor, targetForTownHall, summarizePlan } from "./upgradeLogic";
import { fmtTime, fmtCost } from "./formatters";

export type UpgradePriorityCriterion =
  | "defense-impact"
  | "lowest-time"
  | "lowest-cost"
  | "balanced";

export type BuildingCategoryFilter = "all" | "defense" | "building" | "trap";

export interface DefenseImpactInfo {
  score: number;
  tier: "S+" | "S" | "A+" | "A" | "B+" | "B" | "B-" | "C+" | "C" | "D";
  role: string;
  tag: string;
  description: string;
}

export interface RecommendedBuilding {
  item: UpgradeItem;
  current: number;
  target: number;
  nextLevel: number;
  nextStep: UpgradeLevel;
  plan: ReturnType<typeof summarizePlan>;
  defenseImpact: DefenseImpactInfo;
  reason: string;
  rankBadge: string;
  highlightTag: string;
}

const DEFENSE_IMPACT_MAP: Record<string, DefenseImpactInfo> = {
  "eagle-artillery": {
    score: 99,
    tier: "S+",
    role: "Pháo đại bàng",
    tag: "Phòng thủ tối thượng",
    description: "Tầm bắn toàn bản đồ, hỏa lực chùm nghiền nát quân chủ lực và chia cắt đạo quân địch."
  },
  monolith: {
    score: 98,
    tier: "S+",
    role: "Cột đá ma thuật",
    tag: "Diệt tướng & Tanker",
    description: "Sát thương theo % máu tối đa, vũ khí khắc chế số 1 của Hero và các đơn vị siêu trâu."
  },
  scattershot: {
    score: 96,
    tier: "S+",
    role: "Máy ném đá",
    tag: "Sát thương lan cực mạnh",
    description: "Mảnh đá văng hình nón xóa sổ nhanh bầy lính hỗ trợ và tiêu hao sinh lực Hero đối phương."
  },
  "spell-tower": {
    score: 95,
    tier: "S",
    role: "Tháp phép thuật",
    tag: "Hỗ trợ tàng hình / độc",
    description: "Kích hoạt bình phép bảo vệ các công trình quan trọng xung quanh khi làng bị đột kích."
  },
  "super-wizard-tower": {
    score: 94,
    tier: "S",
    role: "Super Wizard Tower",
    tag: "Sát thương chuỗi sét",
    description: "Tia sét nảy liên hoàn qua nhiều mục tiêu, chặn đứng các đợt càn quét đông."
  },
  "multi-archer-tower": {
    score: 93,
    tier: "S",
    role: "Multi-Archer Tower",
    tag: "Bắn đa mục tiêu",
    description: "3 cung thủ xả tên đồng thời, duy trì mật độ sát thương cực dày khắp khu vực."
  },
  "ricochet-cannon": {
    score: 93,
    tier: "S",
    role: "Ricochet Cannon",
    tag: "Đạn nảy mục tiêu kép",
    description: "Đạn đại bác nảy sang mục tiêu thứ hai gây sát thương nhân đôi lên đội hình cạn."
  },
  firespitter: {
    score: 92,
    tier: "S",
    role: "Firespitter",
    tag: "Hỏa lực phun lửa diện rộng",
    description: "Phun luồng lửa thiêu rụi toàn bộ lính cạn và lính bay trong phạm vi hình nón."
  },
  "revenge-tower": {
    score: 91,
    tier: "S",
    role: "Revenge Tower",
    tag: "Tăng tiến sức mạnh",
    description: "Càng nhiều công trình xung quanh sụp đổ thì sát thương trả đũa càng tăng vọt."
  },
  "inferno-tower": {
    score: 90,
    tier: "S",
    role: "Tháp hỏa ngục",
    tag: "Chống Tanker & Rồng",
    description: "Đơn tia nung chảy Hero/Tanker, đa tia càn quét hiệu quả các nhóm lính đông và Balloon."
  },
  "air-defense": {
    score: 88,
    tier: "A+",
    role: "Pháo phòng không",
    tag: "Khắc chế Rồng & Balloon",
    description: "Trụ cột bắt buộc nâng sớm để chặn đứng chiến thuật xả Rồng, Electro Dragon và Khí cầu."
  },
  xbow: {
    score: 85,
    tier: "A+",
    role: "Nỏ X-Bow",
    tag: "Tốc bắn nhanh & tầm xa",
    description: "Hỏa lực tầm xa ổn định, liên tục khống chế khu vực lõi làng."
  },
  "clan-castle": {
    score: 84,
    tier: "A+",
    role: "Lâu đài Clan",
    tag: "Lính thủ nhà bất ngờ",
    description: "Chứa lính phòng thủ (Ice Golem, Super Minion...) làm đảo lộn chiến thuật của đối phương."
  },
  "tornado-trap": {
    score: 82,
    tier: "A",
    role: "Bẫy lốc xoáy",
    tag: "Cầm chân cả đạo quân",
    description: "Hút xoáy giữ chân mọi mục tiêu cạn lẫn bay, bẻ gãy nhịp dồn sát thương của địch."
  },
  "hidden-tesla": {
    score: 78,
    tier: "A",
    role: "Bẫy điện ẩn",
    tag: "Tấn công bất ngờ",
    description: "Bật lên bất ngờ làm lệch hướng funnel quân địch và dồn sát thương đơn mục tiêu cao."
  },
  "wizard-tower": {
    score: 75,
    tier: "B+",
    role: "Tháp phù thủy",
    tag: "Sát thương lan diện rộng",
    description: "Bắn lan hiệu quả cả trên không lẫn dưới đất, khắc tinh của bầy Dơi và lính nhỏ."
  },
  "air-sweeper": {
    score: 74,
    tier: "B+",
    role: "Máy thổi gió",
    tag: "Đẩy lùi chiến thuật bay",
    description: "Đẩy lùi các đợt bay, kéo dài thời gian tiếp cận và phá hỏng góc tấn công của địch."
  },
  "bomb-tower": {
    score: 72,
    tier: "B+",
    role: "Tháp bom",
    tag: "Nổ bom lớn khi sập",
    description: "Sát thương lan mặt đất và để lại quả bom khổng lồ tiêu diệt toán lính phá hủy nó."
  },
  "giga-bomb": {
    score: 70,
    tier: "B+",
    role: "Bom Giga",
    tag: "Bẫy nổ diện rộng cực mạnh",
    description: "Gây sát thương diện rộng cực lớn lên lính cạn khi bị kích hoạt."
  },
  "seeking-air-mine": {
    score: 69,
    tier: "B+",
    role: "Mìn tầm nhiệt",
    tag: "Diệt ngay lính bay lớn",
    description: "Lao thẳng tiêu diệt hoặc làm trọng thương Healer, Lava Hound hay Dragon."
  },
  "giant-bomb": {
    score: 67,
    tier: "B",
    role: "Bom khổng lồ",
    tag: "Quét sạch lính máu giấy",
    description: "Kích nổ tức thì tiêu diệt nhóm Miner, Hog Rider hoặc Bowler."
  },
  "archer-tower": {
    score: 66,
    tier: "B",
    role: "Tháp cung thủ",
    tag: "Phòng thủ tầm xa ổn định",
    description: "Tầm bắn xa ổn định, hỗ trợ bắn tỉa cả quân cạn và quân bay liên tục."
  },
  cannon: {
    score: 64,
    tier: "B",
    role: "Đại bác",
    tag: "Phòng thủ mặt đất cơ bản",
    description: "Công trình phòng thủ mặt đất cơ bản với tốc độ bắn và độ bền tốt."
  },
  "skeleton-trap": {
    score: 63,
    tier: "B",
    role: "Bẫy bộ xương",
    tag: "Phân tâm đối phương",
    description: "Thả ra các bộ xương quấy rối, giữ chân Hero và phân tán hỏa lực địch."
  },
  "air-bomb": {
    score: 62,
    tier: "B-",
    role: "Bom phòng không",
    tag: "Sát thương lan lính bay",
    description: "Nổ lan tiêu diệt đàn Minion hoặc bầy Dơi bay."
  },
  "builder-hut": {
    score: 60,
    tier: "B-",
    role: "Nhà thợ xây vũ trang",
    tag: "Sửa chữa công trình",
    description: "Thợ xây chạy ra sửa chữa công trình lân cận trong suốt thời gian làng bị đánh."
  },
  "spring-trap": {
    score: 58,
    tier: "C+",
    role: "Bẫy bật nhảy",
    tag: "Bật bay nhóm lính cạn",
    description: "Bật văng ngay lập tức nhóm lính cạn theo giới hạn trọng lượng."
  },
  mortar: {
    score: 55,
    tier: "C+",
    role: "Súng cối",
    tag: "Bắn lan tầm cực xa",
    description: "Bắn lan chậm nhưng tầm rất xa, cản bước hiệu quả các đợt tràn lính nhỏ."
  },
  bomb: {
    score: 48,
    tier: "C",
    role: "Bom thường",
    tag: "Sát thương cạn cơ bản",
    description: "Bẫy ngầm nổ gây sát thương nhỏ lên nhóm lính đầu tiên giẫm phải."
  },
  logger: {
    score: 90,
    tier: "S",
    role: "Hộ vệ Logger",
    tag: "Hộ vệ TH18 mặt đất",
    description: "Hộ vệ TH18 càn quét mặt đất."
  },
  longshot: {
    score: 90,
    tier: "S",
    role: "Hộ vệ Longshot",
    tag: "Hộ vệ TH18 bắn tỉa",
    description: "Hộ vệ TH18 bắn tỉa tầm xa."
  },
  smasher: {
    score: 90,
    tier: "S",
    role: "Hộ vệ Smasher",
    tag: "Hộ vệ TH18 đập lan",
    description: "Hộ vệ TH18 đập lan uy lực."
  },
  laboratory: {
    score: 72,
    tier: "B+",
    role: "Phòng thí nghiệm",
    tag: "Mở trần quân & phép",
    description: "Công trình quân sự cốt lõi mở khóa cấp độ lính và phép thuật mới."
  },
  "army-camp": {
    score: 70,
    tier: "B+",
    role: "Trại lính",
    tag: "Tăng trực tiếp quân số",
    description: "Tăng số lượng lính mang đi tấn công, gia tăng sức mạnh toàn diện."
  },
  blacksmith: {
    score: 68,
    tier: "B",
    role: "Nhà rèn",
    tag: "Cường hóa trang bị",
    description: "Nâng cấp và mở khóa trang bị kỹ năng độc nhất cho các Hero."
  },
  "pet-house": {
    score: 66,
    tier: "B",
    role: "Nhà thú cưng",
    tag: "Mở khóa Pet đồng hành",
    description: "Cung cấp Pet đi kèm để bổ trợ sức mạnh và phòng ngự cho Hero."
  },
  "spell-factory": {
    score: 65,
    tier: "B",
    role: "Nhà máy phép",
    tag: "Tăng sức chứa phép",
    description: "Tăng sức chứa bình phép và mở khóa các loại phép thuật mới."
  },
  "dark-spell-factory": {
    score: 62,
    tier: "B-",
    role: "Nhà máy hắc phép",
    tag: "Mở phép hắc ám",
    description: "Mở khóa các phép hắc ám như Dơi, Băng, Độc."
  },
  workshop: {
    score: 60,
    tier: "B-",
    role: "Xưởng máy công thành",
    tag: "Mở máy công thành",
    description: "Sản xuất máy công thành đưa lính xuyên thủng lớp phòng thủ."
  },
  barracks: {
    score: 55,
    tier: "C+",
    role: "Doanh trại",
    tag: "Mở khóa quân mới",
    description: "Mở khóa các loại quân thường mới."
  },
  "dark-barracks": {
    score: 55,
    tier: "C+",
    role: "Doanh trại hắc ám",
    tag: "Mở khóa quân hắc ám",
    description: "Mở khóa các loại quân Dark Elixir mới."
  },
  "dark-elixir-storage": {
    score: 48,
    tier: "C",
    role: "Kho hắc dầu",
    tag: "Tăng sức chứa Dark Elixir",
    description: "Tăng trần chứa hắc dầu để nâng cấp Hero và lính Dark Elixir."
  },
  "gold-storage": {
    score: 45,
    tier: "C",
    role: "Kho vàng",
    tag: "Tăng sức chứa vàng",
    description: "Tăng trần chứa vàng để đáp ứng các mốc nâng cấp lớn."
  },
  "elixir-storage": {
    score: 45,
    tier: "C",
    role: "Kho dầu",
    tag: "Tăng sức chứa dầu",
    description: "Tăng trần chứa dầu để nâng cấp quân và công trình."
  },
  "dark-elixir-drill": {
    score: 35,
    tier: "D",
    role: "Mỏ hắc dầu",
    tag: "Khai thác Dark Elixir",
    description: "Khai thác hắc dầu thụ động liên tục theo thời gian."
  },
  "gold-mine": {
    score: 30,
    tier: "D",
    role: "Mỏ vàng",
    tag: "Khai thác vàng",
    description: "Khai thác vàng thụ động theo thời gian."
  },
  "elixir-collector": {
    score: 30,
    tier: "D",
    role: "Mỏ dầu",
    tag: "Khai thác dầu",
    description: "Khai thác dầu thụ động theo thời gian."
  }
};

export function getDefenseImpact(item: UpgradeItem): DefenseImpactInfo {
  if (DEFENSE_IMPACT_MAP[item.id]) {
    return DEFENSE_IMPACT_MAP[item.id];
  }
  if (item.kind === "defense") {
    return {
      score: 60,
      tier: "B-",
      role: item.name,
      tag: "Công trình phòng thủ",
      description: "Gia tăng mật độ hỏa lực phòng thủ bảo vệ làng."
    };
  }
  if (item.kind === "trap") {
    return {
      score: 50,
      tier: "C",
      role: item.name,
      tag: "Bẫy ngầm",
      description: "Bẫy phòng thủ ngầm quấy rối và tiêu hao quân địch."
    };
  }
  return {
    score: 40,
    tier: "C",
    role: item.name,
    tag: "Công trình phụ trợ",
    description: "Hỗ trợ vận hành tài nguyên và các hàng chờ quân sự."
  };
}

export function normalizeResourceCost(resource: Resource, cost: number): number {
  if (resource === "Dark Elixir") return cost * 120;
  return cost;
}

export function getTop3BuildingRecommendations({
  items = upgradeItems,
  player,
  manualLevels,
  targetTownHall,
  goldPassDiscount = 0,
  criterion = "defense-impact",
  categoryFilter = "all"
}: {
  items?: UpgradeItem[];
  player: Player | null;
  manualLevels: Record<string, number>;
  targetTownHall: number;
  goldPassDiscount?: number;
  criterion?: UpgradePriorityCriterion;
  categoryFilter?: BuildingCategoryFilter;
}): RecommendedBuilding[] {
  // Candidate structures: Builder lane items of kind building, defense, or trap
  const candidateItems = items.filter(item => {
    if (item.lane !== "Builder") return false;
    if (item.id === "town-hall") return false; // Town Hall is level progression, not base structure
    if (item.kind !== "building" && item.kind !== "defense" && item.kind !== "trap") return false;
    if (categoryFilter !== "all" && item.kind !== categoryFilter) return false;
    if (item.unlockTownHall > targetTownHall) return false;
    return true;
  });

  const qualifiedCandidates: {
    item: UpgradeItem;
    current: number;
    target: number;
    nextLevel: number;
    nextStep: UpgradeLevel;
    plan: ReturnType<typeof summarizePlan>;
    defenseImpact: DefenseImpactInfo;
    normalizedNextCost: number;
    valueScore: number;
  }[] = [];

  for (const item of candidateItems) {
    const current = currentLevelFor(item, player, manualLevels);
    const target = targetForTownHall(item, targetTownHall);

    if (target > current) {
      const plan = summarizePlan(item, current, target, 1, goldPassDiscount);
      if (plan.steps.length > 0) {
        const nextStep = plan.steps[0];
        const defenseImpact = getDefenseImpact(item);
        const normalizedNextCost = normalizeResourceCost(nextStep.resource, nextStep.cost);

        // Value ROI score for balanced criterion
        const hoursNorm = Math.max(0.5, nextStep.timeHours);
        const costNorm = Math.max(1000, normalizedNextCost);
        const valueScore =
          (defenseImpact.score * 2.2) /
          (1 + (hoursNorm / 24) * 0.18 + Math.log10(costNorm / 1000) * 0.16);

        qualifiedCandidates.push({
          item,
          current,
          target,
          nextLevel: nextStep.level,
          nextStep,
          plan,
          defenseImpact,
          normalizedNextCost,
          valueScore
        });
      }
    }
  }

  // Sorting according to selected criterion
  qualifiedCandidates.sort((a, b) => {
    if (criterion === "lowest-time") {
      // Shortest next-step time first
      if (a.nextStep.timeHours !== b.nextStep.timeHours) {
        return a.nextStep.timeHours - b.nextStep.timeHours;
      }
      // If time equal, compare total plan time
      if (a.plan.totalHours !== b.plan.totalHours) {
        return a.plan.totalHours - b.plan.totalHours;
      }
      return a.normalizedNextCost - b.normalizedNextCost;
    }

    if (criterion === "lowest-cost") {
      // Lowest next-step resource cost first
      if (a.normalizedNextCost !== b.normalizedNextCost) {
        return a.normalizedNextCost - b.normalizedNextCost;
      }
      return a.nextStep.timeHours - b.nextStep.timeHours;
    }

    if (criterion === "balanced") {
      if (Math.abs(b.valueScore - a.valueScore) > 0.05) {
        return b.valueScore - a.valueScore;
      }
      return b.defenseImpact.score - a.defenseImpact.score;
    }

    // Default: "defense-impact"
    if (b.defenseImpact.score !== a.defenseImpact.score) {
      return b.defenseImpact.score - a.defenseImpact.score;
    }
    // If tied in impact, prioritize items with larger upgrade gap (target - current)
    const gapA = a.target - a.current;
    const gapB = b.target - b.current;
    if (gapB !== gapA) return gapB - gapA;
    return a.nextStep.timeHours - b.nextStep.timeHours;
  });

  const top3 = qualifiedCandidates.slice(0, 3);
  const rankLabels = ["#1 Ưu tiên số 1", "#2 Ưu tiên cao", "#3 Đề xuất"];

  return top3.map((entry, idx) => {
    let reason = "";
    let highlightTag = "";

    const timeStr = fmtTime(entry.nextStep.timeHours);
    const costStr = fmtCost({ [entry.nextStep.resource]: entry.nextStep.cost });

    switch (criterion) {
      case "lowest-time":
        highlightTag = `⚡ ${timeStr}`;
        reason = `Thời gian hoàn thành nhanh nhất (${timeStr} cho Lv ${entry.nextLevel}). Thích hợp khi cần giải phóng thợ xây gấp để luân chuyển việc khác.`;
        break;

      case "lowest-cost":
        highlightTag = `💰 ${costStr}`;
        reason = `Chi phí rẻ nhất (${costStr}). Tiêu tốn ít tài nguyên, dễ dàng nâng cấp ngay lập tức mà không phải tốn công cày cuốc (farm).`;
        break;

      case "balanced":
        highlightTag = `⭐ ROI cao (${entry.defenseImpact.tier})`;
        reason = `Hiệu quả đầu tư (ROI) tốt nhất: Cân đối giữa sức mạnh phòng thủ (${entry.defenseImpact.score}/100), chi phí (${costStr}) và thời gian (${timeStr}).`;
        break;

      case "defense-impact":
      default:
        highlightTag = `🛡️ Hạng ${entry.defenseImpact.tier} · ${entry.defenseImpact.score}/100`;
        reason = `${entry.defenseImpact.tag}: ${entry.defenseImpact.description}`;
        break;
    }

    return {
      item: entry.item,
      current: entry.current,
      target: entry.target,
      nextLevel: entry.nextLevel,
      nextStep: entry.nextStep,
      plan: entry.plan,
      defenseImpact: entry.defenseImpact,
      reason,
      rankBadge: rankLabels[idx] || `#${idx + 1} Đề xuất`,
      highlightTag
    };
  });
}
