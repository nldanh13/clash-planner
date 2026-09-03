import { BUILDINGS_BY_ID, GRID_SIZE } from "./constants";
import { getTileGap, scanChainLightningHazards } from "./chainLightningUtils";
import { calculateFirepowerHeatmap } from "./heatmapUtils";
import { getAllBuildingLimits } from "./buildingLimits";
import type {
  DefenseScoreResult,
  DefenseWarning,
  PlacedBuilding,
  ScoreCategoryBreakdown,
} from "./types";

/**
 * Thuật toán tính Điểm bố trí tham khảo (Heuristic cơ bản, 0 - 100 Điểm)
 */
export function evaluateBaseDefense(buildings: PlacedBuilding[], townHallLevel: number): DefenseScoreResult {
  const warnings: DefenseWarning[] = [];

  warnings.push({
    id: "model-limit",
    type: "tip",
    title: "Giới hạn đánh giá",
    message: "Đây là điểm tham khảo cơ bản. Thuật toán chưa xét cấp độ công trình, hướng thổi của Air Sweeper, chế độ Inferno/X-Bow, thiết kế khoang tường và thuật toán tìm đường (pathing) của lính.",
    category: "core",
  });


  if (buildings.length === 0) {
    return {
      totalScore: 0,
      tier: "D",
      tierTitle: "Bản đồ trống",
      tierColor: "#95a5a6",
      breakdown: {
        core: { id: "core", name: "Hệ số Cốt lõi", score: 0, maxScore: 30, description: "Chưa đặt công trình cốt lõi" },
        chain: { id: "chain", name: "Chống sét lan (E-Drag)", score: 0, maxScore: 20, description: "Chưa có công trình" },
        splash: { id: "splash", name: "Phủ sóng Sát thương lan", score: 0, maxScore: 20, description: "Chưa có tháp sát thương lan" },
        trap: { id: "trap", name: "Hiệu quả Bẫy", score: 0, maxScore: 15, description: "Chưa đặt bẫy" },
        th: { id: "th", name: "Vị trí Town Hall", score: 0, maxScore: 15, description: "Chưa đặt Town Hall" },
      },
      warnings: [{ id: "empty", type: "tip", title: "Bản đồ trống", message: "Hãy kéo thả công trình từ kho đồ bên trái hoặc tải mẫu bố cục chuẩn.", category: "core" }],
      heatStats: { maxCoverage: 0, blindSpotsPercent: 100, quadrantBalance: { nw: 0, ne: 0, sw: 0, se: 0 } },
    };
  }


  // --- 0. PENALTY THIẾU CÔNG TRÌNH ---
  const limits = getAllBuildingLimits(townHallLevel);
  const expectedCoreIds = ["eagle-artillery", "inferno-tower", "scattershot", "monolith"];
  let missingCoreCount = 0;
  for (const cid of expectedCoreIds) {
      const allowed = limits[cid] || 0;
      const placed = buildings.filter(b => b.buildingId === cid).length;
      if (allowed > 0 && placed < allowed) {
          missingCoreCount += (allowed - placed);
      }
  }
  if (missingCoreCount > 0) {
      warnings.push({
          id: "missing-core",
          type: "warning",
          title: "Thiếu công trình phòng thủ lõi",
          message: `Bạn chưa đặt đủ ${missingCoreCount} công trình phòng thủ chủ lực cho TH${townHallLevel}. Điểm số có thể không phản ánh đúng sức mạnh.`,
          category: "core"
      });
  }

  // --- 1. HỆ SỐ CỐT LÕI (Max 30 Điểm) ---

  // A. Core Spacing (18 pts): Monolith, Eagle, Inferno, Scattershot distance >= 3 tiles
  let coreScore = 0;
  const coreBuildings = buildings.filter((b) =>
    ["monolith", "eagle-artillery", "inferno-tower", "scattershot", "spell-tower"].includes(b.buildingId)
  );

  let coreClumpPenalty = 0;
  for (let i = 0; i < coreBuildings.length; i++) {
    const b1 = coreBuildings[i];
    const def1 = BUILDINGS_BY_ID.get(b1.buildingId);
    if (!def1) continue;

    for (let j = i + 1; j < coreBuildings.length; j++) {
      const b2 = coreBuildings[j];
      const def2 = BUILDINGS_BY_ID.get(b2.buildingId);
      if (!def2) continue;

      const gap = getTileGap(b1.x, b1.y, def1.width, def1.height, b2.x, b2.y, def2.width, def2.height);
      if (gap < 3) {
        coreClumpPenalty += (3 - gap) * 3;
        warnings.push({
          id: `core-clump-${b1.instanceId}-${b2.instanceId}`,
          type: "critical",
          title: "Trụ chủ lực quá sát nhau!",
          message: `${def1.name} và ${def2.name} chỉ cách nhau ${gap} ô. Cần cách ≥ 3 ô để tránh bị 1 bình Freeze hoặc Zap/Quake tiêu diệt đồng thời.`,
          category: "core",
        });
      }
    }
  }

  const coreSpacingPts = Math.max(0, 18 - coreClumpPenalty);

  // B. Storage Meat-shielding (12 pts): High HP storages placed near key defenses
  const storages = buildings.filter((b) =>
    ["gold-storage", "elixir-storage", "dark-elixir-storage", "clan-castle"].includes(b.buildingId)
  );

  let shieldedCoreCount = 0;
  for (const core of coreBuildings) {
    const cDef = BUILDINGS_BY_ID.get(core.buildingId);
    if (!cDef) continue;
    const cx = core.x + cDef.width / 2;
    const cy = core.y + cDef.height / 2;

    const hasNearbyStorage = storages.some((st) => {
      const sDef = BUILDINGS_BY_ID.get(st.buildingId);
      if (!sDef) return false;
      const sx = st.x + sDef.width / 2;
      const sy = st.y + sDef.height / 2;
      const dist = Math.hypot(cx - sx, cy - sy);
      return dist <= 6.5; // Within 6.5 tiles
    });

    if (hasNearbyStorage) shieldedCoreCount++;
  }

  const storageShieldPts = coreBuildings.length > 0
    ? Math.round((shieldedCoreCount / coreBuildings.length) * 12)
    : (storages.length >= 4 ? 8 : 4);

  if (coreBuildings.length > 0 && shieldedCoreCount < Math.min(2, coreBuildings.length)) {
    warnings.push({
      id: "storage-shield-warning",
      type: "warning",
      title: "Thiếu khiên thịt kho chứa",
      message: "Nên đặt các Kho Vàng / Elixir / Lâu đài Clan (máu dày) phía trước các trụ Inferno/Monolith/Eagle để hút sát thương khi địch tràn vào.",
      category: "core",
    });
  }

  coreScore = Math.min(30, coreSpacingPts + storageShieldPts);

  // --- 2. HỆ SỐ CHỐNG SÉT LAN (Max 20 Điểm) ---
  const chainAnalysis = scanChainLightningHazards(buildings, 2);
  let chainScore = 20;
  if (chainAnalysis.criticalCount > 0) {
    chainScore -= Math.min(14, chainAnalysis.criticalCount * 2.5);
  }
  if (chainAnalysis.warningCount > 0) {
    chainScore -= Math.min(6, chainAnalysis.warningCount * 1.0);
  }
  chainScore = Math.max(0, Math.round(chainScore));

  if (chainAnalysis.criticalCount > 0) {
    warnings.push({
      id: "chain-crit-warning",
      type: "critical",
      title: "Nguy cơ sét lan E-Dragon cao!",
      message: `Phát hiện ${chainAnalysis.criticalCount} cặp công trình đặt cách ≤ 1 ô. Rồng Điện (Electro Dragon) sẽ giật sét chuỗi phá hủy toàn bộ khu vực này. Hãy dãn cách ≥ 2 ô.`,
      category: "chain",
    });
  }

  // --- 3. HỆ SỐ PHỦ SÓNG SÁT THƯƠNG LAN (Max 20 Điểm) ---
  const splashDefenses = buildings.filter((b) =>
    ["wizard-tower", "bomb-tower", "scattershot", "mortar", "town-hall"].includes(b.buildingId)
  );

  const quadrants = { nw: 0, ne: 0, sw: 0, se: 0 };
  const half = GRID_SIZE / 2;

  for (const b of splashDefenses) {
    const def = BUILDINGS_BY_ID.get(b.buildingId);
    if (!def) continue;
    const cx = b.x + def.width / 2;
    const cy = b.y + def.height / 2;
    if (cx < half && cy < half) quadrants.nw++;
    else if (cx >= half && cy < half) quadrants.ne++;
    else if (cx < half && cy >= half) quadrants.sw++;
    else quadrants.se++;
  }

  const quadValues = Object.values(quadrants);
  const activeQuads = quadValues.filter((c) => c > 0).length;
  let splashScore = (activeQuads / 4) * 16;
  if (splashDefenses.length >= 6) splashScore += 4;
  else if (splashDefenses.length >= 3) splashScore += 2;
  splashScore = Math.min(20, Math.round(splashScore));

  if (quadrants.nw === 0 && splashDefenses.length > 0) {
    warnings.push({ id: "splash-nw", type: "warning", title: "Vùng mù hỏa lực góc Tây Bắc", message: "Góc Tây Bắc (NW) thiếu tháp sát thương lan (Wizard/Bomb Tower/Scattershot). Rất dễ bị bầy Dơi (Bat Wave) hoặc Lính Xương càn quét!", category: "splash" });
  }
  if (quadrants.ne === 0 && splashDefenses.length > 0) {
    warnings.push({ id: "splash-ne", type: "warning", title: "Vùng mù hỏa lực góc Đông Bắc", message: "Góc Đông Bắc (NE) thiếu tháp sát thương diện rộng. Cần điều động thêm Wizard Tower sang góc này.", category: "splash" });
  }
  if (quadrants.sw === 0 && splashDefenses.length > 0) {
    warnings.push({ id: "splash-sw", type: "warning", title: "Vùng mù hỏa lực góc Tây Nam", message: "Góc Tây Nam (SW) thiếu phòng thủ sát thương lan.", category: "splash" });
  }
  if (quadrants.se === 0 && splashDefenses.length > 0) {
    warnings.push({ id: "splash-se", type: "warning", title: "Vùng mù hỏa lực góc Đông Nam", message: "Góc Đông Nam (SE) thiếu phòng thủ sát thương lan.", category: "splash" });
  }

  // --- 4. HỆ SỐ VỊ TRÍ BẪY (Max 15 Điểm) ---
  const traps = buildings.filter((b) => {
    const def = BUILDINGS_BY_ID.get(b.buildingId);
    return def && def.category === "trap";
  });

  const nonTrapBuildings = buildings.filter((b) => {
    const def = BUILDINGS_BY_ID.get(b.buildingId);
    return def && def.category !== "trap" && def.category !== "wall";
  });

  let trapPoints = 0;
  const th = buildings.find((b) => b.buildingId === "town-hall");
  if (!th) {
    warnings.push({
      id: "th-missing",
      type: "critical",
      title: "Thiếu Town Hall",
      message: "Bạn chưa đặt Town Hall. Hãy kéo thả Town Hall vào bản đồ.",
      category: "th",
    });
  }
  const tornado = traps.find((b) => b.buildingId === "tornado-trap");

  // A. Tornado placement near TH or Core
  if (tornado && th) {
    const tDist = Math.hypot(tornado.x - th.x, tornado.y - th.y);
    if (tDist <= 6.5) {
      trapPoints += 5;
    } else {
      trapPoints += 2;
      warnings.push({
        id: "tornado-far",
        type: "tip",
        title: "Bẫy Lốc Xoáy (Tornado) đặt quá xa Town Hall",
        message: "Nên đặt Tornado Trap trong phạm vi 5 ô quanh Town Hall hoặc Monolith để bẫy Blimp Super Archer / Blizzard.",
        category: "trap",
      });
    }
  } else if (traps.length > 0) {
    trapPoints += 3;
  }

  // B. Giant Bombs & Spring Traps sandwiching between defenses
  const impactTraps = traps.filter((t) => ["giant-bomb", "spring-trap"].includes(t.buildingId));
  let goodTrapCount = 0;

  for (const trap of impactTraps) {
    const tDef = BUILDINGS_BY_ID.get(trap.buildingId);
    if (!tDef) continue;
    const tx = trap.x + tDef.width / 2;
    const ty = trap.y + tDef.height / 2;

    // Check how many defenses are within 3 tiles
    const adjacentDefenses = nonTrapBuildings.filter((b) => {
      const bDef = BUILDINGS_BY_ID.get(b.buildingId);
      if (!bDef) return false;
      const bx = b.x + bDef.width / 2;
      const by = b.y + bDef.height / 2;
      return Math.hypot(tx - bx, ty - by) <= 3.2;
    });

    if (adjacentDefenses.length >= 2) {
      goodTrapCount++;
    }
  }

  const trapPlacementRatio = impactTraps.length > 0 ? goodTrapCount / impactTraps.length : 0.5;
  trapPoints += Math.round(trapPlacementRatio * 10);
  const trapScore = Math.min(15, Math.max(0, trapPoints));

  if (impactTraps.length > 0 && goodTrapCount < Math.ceil(impactTraps.length / 2)) {
    warnings.push({
      id: "trap-isolated",
      type: "tip",
      title: "Bẫy chưa tối ưu điểm nghẽn",
      message: "Hãy kẹp Bom Khổng Lồ và Bẫy Lò Xo giữa 2 công trình phòng thủ để đảm bảo lính Hog Rider / Miner / Valkyrie bắt buộc phải dẫm vào.",
      category: "trap",
    });
  }

  // --- 5. HỆ SỐ VỊ TRÍ TOWN HALL (Max 15 Điểm) ---
  let thScore = 10;
  if (th) {
    const thCenterX = th.x + 2;
    const thCenterY = th.y + 2;
    const distFromCenter = Math.hypot(thCenterX - 22, thCenterY - 22);

    // TH within reasonable defense radius (central or strategic anti-3-star offset)
    if (distFromCenter <= 10) {
      thScore = 15; // Well-placed core or semi-core
    } else if (distFromCenter <= 16) {
      thScore = 12; // Anti-3 star edge compartment
    } else {
      thScore = 6; // Exposed outer ring
      warnings.push({
        id: "th-exposed",
        type: "warning",
        title: "Town Hall đặt quá sát mép bản đồ",
        message: "Town Hall đang ở viền ngoài cùng, rất dễ bị địch tỉa ăn 1 sao miễn phí bằng Archer Queen hoặc Flame Flinger.",
        category: "th",
      });
    }
  } else {
    thScore = 0;
    warnings.push({
      id: "no-th",
      type: "critical",
      title: "Chưa đặt Town Hall!",
      message: "Hãy đặt Town Hall để làm trung tâm bố cục của làng.",
      category: "th",
    });
  }

  // --- TỔNG ĐIỂM & XẾP HẠNG TIER ---
  const totalScore = Math.min(100, Math.max(0, coreScore + chainScore + splashScore + trapScore + thScore));

  let tier: "S" | "A" | "B" | "C" | "D" = "C";
  let tierTitle = "Bố cục cơ bản";
  let tierColor = "#e67e22";

  if (totalScore >= 90) {
    tier = "S";
    tierTitle = "Tuyệt vời (Bố cục chuẩn)";
    tierColor = "#2ecc71";
  } else if (totalScore >= 75) {
    tier = "A";
    tierTitle = "Rất tốt (Phân bổ phòng thủ tốt)";
    tierColor = "#3498db";
  } else if (totalScore >= 60) {
    tier = "B";
    tierTitle = "Khá tốt (Cần tối ưu thêm bẫy/dãn cách)";
    tierColor = "#f1c40f";
  } else if (totalScore >= 45) {
    tier = "C";
    tierTitle = "Trung bình (Có nhiều lỗ hổng)";
    tierColor = "#e67e22";
  } else {
    tier = "D";
    tierTitle = "Cần cải thiện (Nhiều điểm nghẽn)";
    tierColor = "#e74c3c";
  }

  const heat = calculateFirepowerHeatmap(buildings);

  return {
    totalScore,
    tier,
    tierTitle,
    tierColor,
    breakdown: {
      core: {
        id: "core",
        name: "Hệ số Cốt lõi & Khiên thịt",
        score: coreScore,
        maxScore: 30,
        description: "Dãn cách trụ chủ lực (≥3 ô) & kho chứa HP dày che chắn",
      },
      chain: {
        id: "chain",
        name: "Chống sét lan (Electro Dragon)",
        score: chainScore,
        maxScore: 20,
        description: "Triệt tiêu các cặp công trình sát nhau (khoảng cách ≥2 ô)",
      },
      splash: {
        id: "splash",
        name: "Phủ sóng Sát thương lan",
        score: splashScore,
        maxScore: 20,
        description: "Phân bổ tháp Wizard/Bomb/Scattershot đều 4 góc bản đồ",
      },
      trap: {
        id: "trap",
        name: "Hiệu quả Bẫy & Điểm nghẽn",
        score: trapScore,
        maxScore: 15,
        description: "Kẹp bẫy giữa trụ phòng thủ & Tornado bảo vệ Town Hall",
      },
      th: {
        id: "th",
        name: "Vị trí & Bảo vệ Town Hall",
        score: thScore,
        maxScore: 15,
        description: "Vị trí chiến lược chống 2-3 sao",
      },
    },
    warnings,
    heatStats: {
      maxCoverage: heat.maxDensity,
      blindSpotsPercent: heat.blindSpotsPercent,
      quadrantBalance: heat.quadrantBalance,
    },
  };
}
