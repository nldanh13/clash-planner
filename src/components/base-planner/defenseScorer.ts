import { BUILDINGS_BY_ID, GRID_SIZE } from "./constants";
import { getTileGap, scanChainLightningHazards } from "./chainLightningUtils";
import { calculateFirepowerHeatmap } from "./heatmapUtils";
import { getAllBuildingLimits } from "./buildingLimits";
import { computeDeploymentAnalysis } from "./deploymentZones";
import { computeDeploymentRisk, getDeploymentWarnings } from "./deploymentRisk";
import type {
  BasePurpose,
  DefenseScoreResult,
  DefenseWarning,
  PlacedBuilding,
  ScoreCategoryBreakdown,
} from "./types";
import { vi } from "../../i18n/locales/vi";

function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}

/**
 * Thuật toán tính Điểm bố trí tham khảo (Heuristic cơ bản, 0 - 100 Điểm)
 */
export function evaluateBaseDefense(
  buildings: PlacedBuilding[],
  townHallLevel: number,
  purpose: BasePurpose = "hybrid"
): DefenseScoreResult {
  const warnings: DefenseWarning[] = [];

  warnings.push({
    id: "model-limit",
    type: "tip",
    title: vi.defenseScorer.modelLimitTitle,
    message: vi.defenseScorer.modelLimitMessage,
    category: "core",
  });


  if (buildings.length === 0) {
    return {
      totalScore: 0,
      tier: "D",
      tierTitle: vi.defenseScorer.emptyMap.tierTitle,
      tierColor: "#95a5a6",
      breakdown: {
        core: { id: "core", name: vi.defenseScorer.emptyMap.core.name, score: 0, maxScore: 30, description: vi.defenseScorer.emptyMap.core.description },
        chain: { id: "chain", name: vi.defenseScorer.emptyMap.chain.name, score: 0, maxScore: 20, description: vi.defenseScorer.emptyMap.chain.description },
        splash: { id: "splash", name: vi.defenseScorer.emptyMap.splash.name, score: 0, maxScore: 20, description: vi.defenseScorer.emptyMap.splash.description },
        trap: { id: "trap", name: vi.defenseScorer.emptyMap.trap.name, score: 0, maxScore: 15, description: vi.defenseScorer.emptyMap.trap.description },
        th: { id: "th", name: vi.defenseScorer.emptyMap.th.name, score: 0, maxScore: 15, description: vi.defenseScorer.emptyMap.th.description },
      },
      warnings: [{ id: "empty", type: "tip", title: vi.defenseScorer.emptyMap.tierTitle, message: vi.defenseScorer.emptyMap.warningMessage, category: "core" }],
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
          title: vi.defenseScorer.missingCoreTitle,
          message: fmt(vi.defenseScorer.missingCoreMessage, { count: missingCoreCount, th: townHallLevel }),
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
          title: vi.defenseScorer.coreClumpTitle,
          message: fmt(vi.defenseScorer.coreClumpMessage, { name1: def1.name, name2: def2.name, gap }),
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
      title: vi.defenseScorer.storageShieldTitle,
      message: vi.defenseScorer.storageShieldMessage,
      category: "core",
    });
  }

  // --- 1b. VÙNG CẤM TRIỂN KHAI (Deployment Zone) ---
  // Deployment risk (internal holes, corridors, uncovered perimeter) eats into
  // the same "Core" budget as clumping/shielding: both are about whether the
  // core of the base is actually reachable/safe, not separate concerns.
  const deploymentAnalysis = computeDeploymentAnalysis(buildings);
  const deploymentRisk = computeDeploymentRisk(deploymentAnalysis, buildings, purpose);
  const deploymentPenalty = Math.min(15, Math.round(deploymentRisk.deploymentRiskScore / 4));
  warnings.push(...getDeploymentWarnings(deploymentAnalysis, buildings, purpose));

  coreScore = Math.max(0, Math.min(30, coreSpacingPts + storageShieldPts) - deploymentPenalty);

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
      title: vi.defenseScorer.chainCritTitle,
      message: fmt(vi.defenseScorer.chainCritMessage, { count: chainAnalysis.criticalCount }),
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
    warnings.push({ id: "splash-nw", type: "warning", title: vi.defenseScorer.splashBlindSpots.nwTitle, message: vi.defenseScorer.splashBlindSpots.nwMessage, category: "splash" });
  }
  if (quadrants.ne === 0 && splashDefenses.length > 0) {
    warnings.push({ id: "splash-ne", type: "warning", title: vi.defenseScorer.splashBlindSpots.neTitle, message: vi.defenseScorer.splashBlindSpots.neMessage, category: "splash" });
  }
  if (quadrants.sw === 0 && splashDefenses.length > 0) {
    warnings.push({ id: "splash-sw", type: "warning", title: vi.defenseScorer.splashBlindSpots.swTitle, message: vi.defenseScorer.splashBlindSpots.swMessage, category: "splash" });
  }
  if (quadrants.se === 0 && splashDefenses.length > 0) {
    warnings.push({ id: "splash-se", type: "warning", title: vi.defenseScorer.splashBlindSpots.seTitle, message: vi.defenseScorer.splashBlindSpots.seMessage, category: "splash" });
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
      title: vi.defenseScorer.thMissingTitle,
      message: vi.defenseScorer.thMissingMessage,
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
        title: vi.defenseScorer.tornadoFarTitle,
        message: vi.defenseScorer.tornadoFarMessage,
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
      title: vi.defenseScorer.trapIsolatedTitle,
      message: vi.defenseScorer.trapIsolatedMessage,
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
        title: vi.defenseScorer.thExposedTitle,
        message: vi.defenseScorer.thExposedMessage,
        category: "th",
      });
    }
  } else {
    thScore = 0;
    warnings.push({
      id: "no-th",
      type: "critical",
      title: vi.defenseScorer.noThTitle,
      message: vi.defenseScorer.noThMessage,
      category: "th",
    });
  }

  // --- TỔNG ĐIỂM & XẾP HẠNG TIER ---
  const totalScore = Math.min(100, Math.max(0, coreScore + chainScore + splashScore + trapScore + thScore));

  let tier: "S" | "A" | "B" | "C" | "D" = "C";
  let tierTitle: string = vi.defenseScorer.tiers.basic;
  let tierColor = "#e67e22";

  if (totalScore >= 90) {
    tier = "S";
    tierTitle = vi.defenseScorer.tiers.s;
    tierColor = "#2ecc71";
  } else if (totalScore >= 75) {
    tier = "A";
    tierTitle = vi.defenseScorer.tiers.a;
    tierColor = "#3498db";
  } else if (totalScore >= 60) {
    tier = "B";
    tierTitle = vi.defenseScorer.tiers.b;
    tierColor = "#f1c40f";
  } else if (totalScore >= 45) {
    tier = "C";
    tierTitle = vi.defenseScorer.tiers.c;
    tierColor = "#e67e22";
  } else {
    tier = "D";
    tierTitle = vi.defenseScorer.tiers.d;
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
        name: vi.defenseScorer.breakdown.core.name,
        score: coreScore,
        maxScore: 30,
        description: vi.defenseScorer.breakdown.core.description,
      },
      chain: {
        id: "chain",
        name: vi.defenseScorer.breakdown.chain.name,
        score: chainScore,
        maxScore: 20,
        description: vi.defenseScorer.breakdown.chain.description,
      },
      splash: {
        id: "splash",
        name: vi.defenseScorer.breakdown.splash.name,
        score: splashScore,
        maxScore: 20,
        description: vi.defenseScorer.breakdown.splash.description,
      },
      trap: {
        id: "trap",
        name: vi.defenseScorer.breakdown.trap.name,
        score: trapScore,
        maxScore: 15,
        description: vi.defenseScorer.breakdown.trap.description,
      },
      th: {
        id: "th",
        name: vi.defenseScorer.breakdown.th.name,
        score: thScore,
        maxScore: 15,
        description: vi.defenseScorer.breakdown.th.description,
      },
    },
    warnings,
    heatStats: {
      maxCoverage: heat.maxDensity,
      blindSpotsPercent: heat.blindSpotsPercent,
      quadrantBalance: heat.quadrantBalance,
    },
    deployment: deploymentAnalysis,
  };
}
