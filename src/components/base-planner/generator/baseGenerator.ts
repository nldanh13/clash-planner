import type { PlacedBuilding } from "../types";
import { GRID_SIZE, BUILDINGS_BY_ID } from "../constants";
import { getTownHallCatalog, type TownHallBuildingEntry } from "../catalog";
import type {
  GenerateBaseOptions,
  GeneratedBaseResult,
  BaseScore,
  BasePurpose,
  AestheticPattern,
} from "./types";
import { PRNG } from "./prng";
import { PlacementEngine } from "./placementEngine";
import { WallGenerator } from "./wallGenerator";
import { validateGeneratedBase } from "./generatorValidator";
import { STRATEGY_PROFILES } from "./strategyProfiles";

export function generateBase(options: GenerateBaseOptions): GeneratedBaseResult {
  const startTime = performance.now();
  const thLevel = Math.max(1, Math.min(18, Math.trunc(options.townHallLevel) || 11));
  const purpose: BasePurpose = options.purpose || "war";
  const pattern: AestheticPattern | undefined = options.pattern;

  const prng = new PRNG(options.seed);
  const actualSeed = prng.getSeed();

  // Try generating with deterministic retry fallback if needed
  let result: GeneratedBaseResult | null = null;
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    const attemptPrng = attempts === 0 ? prng : prng.fork(attempts * 17);
    const engine = new PlacementEngine(attemptPrng);

    try {
      const buildings = executeGenerationPipeline({
        engine,
        prng: attemptPrng,
        townHallLevel: thLevel,
        purpose,
        pattern,
        preferences: options.preferences,
      });

      const validation = validateGeneratedBase(buildings, thLevel);

      if (validation.isValid && validation.isComplete) {
        const score = computeBaseScore(buildings, thLevel, purpose);
        result = {
          success: true,
          buildings,
          townHallLevel: thLevel,
          purpose,
          pattern,
          seed: actualSeed,
          stats: validation.stats,
          score,
          warnings: validation.warnings,
          executionTimeMs: Math.round(performance.now() - startTime),
        };
        break;
      } else {
        attempts++;
        if (attempts >= maxAttempts) {
          const score = computeBaseScore(buildings, thLevel, purpose);
          result = {
            success: false,
            buildings,
            townHallLevel: thLevel,
            purpose,
            pattern,
            seed: actualSeed,
            stats: validation.stats,
            score,
            warnings: validation.warnings,
            error: validation.errors.slice(0, 5).join(" | "),
            executionTimeMs: Math.round(performance.now() - startTime),
          };
        }
      }
    } catch (err: any) {
      attempts++;
      if (attempts >= maxAttempts) {
        const emptyCatalog = getTownHallCatalog(thLevel);
        const dummyValidation = validateGeneratedBase([], thLevel);
        result = {
          success: false,
          buildings: [],
          townHallLevel: thLevel,
          purpose,
          pattern,
          seed: actualSeed,
          stats: dummyValidation.stats,
          score: getEmptyScore(),
          warnings: [],
          error: err?.message || "Lỗi không xác định trong quá trình sinh base.",
          executionTimeMs: Math.round(performance.now() - startTime),
        };
      }
    }
  }

  return result!;
}

interface PipelineContext {
  engine: PlacementEngine;
  prng: PRNG;
  townHallLevel: number;
  purpose: BasePurpose;
  pattern?: AestheticPattern;
  preferences?: GenerateBaseOptions["preferences"];
}

function executeGenerationPipeline(ctx: PipelineContext): PlacedBuilding[] {
  const { purpose } = ctx;

  if (purpose === "progress") {
    return buildProgressBase(ctx);
  } else if (purpose === "showcase") {
    return buildShowcaseBase(ctx);
  } else {
    return buildTacticalBase(ctx);
  }
}

/**
 * -----------------------------------------------------------------------------
 * PIPELINE A: PROGRESS BASE (Strict grid rows, organized for upgrades)
 * -----------------------------------------------------------------------------
 */
function buildProgressBase(ctx: PipelineContext): PlacedBuilding[] {
  const { engine, townHallLevel } = ctx;
  const catalog = getTownHallCatalog(townHallLevel);
  const placed: PlacedBuilding[] = [];

  // Group items by category / tier
  const commandIds = ["town-hall", "clan-castle", "hero-hall", "helper-hut", "builder-hut"];
  const heavyDefenseIds = [
    "eagle-artillery",
    "inferno-tower",
    "monolith",
    "spell-tower",
    "xbow",
    "scattershot",
    "multi-archer-tower",
    "ricochet-cannon",
    "firespitter",
  ];
  const standardDefenseIds = [
    "air-defense",
    "air-sweeper",
    "wizard-tower",
    "bomb-tower",
    "mortar",
    "hidden-tesla",
    "cannon",
    "archer-tower",
  ];
  const resourceIds = [
    "dark-elixir-storage",
    "gold-storage",
    "elixir-storage",
    "dark-elixir-drill",
    "gold-mine",
    "elixir-collector",
  ];
  const armyIds = [
    "army-camp",
    "barracks",
    "dark-barracks",
    "laboratory",
    "spell-factory",
    "dark-spell-factory",
    "blacksmith",
    "workshop",
    "pet-house",
    "hero-banner",
  ];
  const trapIds = [
    "giant-bomb",
    "giga-bomb",
    "tornado-trap",
    "seeking-air-mine",
    "air-bomb",
    "skeleton-trap",
    "spring-trap",
    "bomb",
  ];

  let wallCount = 0;
  const itemQueue: Array<{ buildingId: string; w: number; h: number }> = [];

  function enqueueGroup(ids: string[]) {
    for (const id of ids) {
      const entry = catalog.find((e) => e.buildingId === id);
      if (entry) {
        for (let i = 0; i < entry.count; i++) {
          itemQueue.push({ buildingId: id, w: entry.width, h: entry.height });
        }
      }
    }
  }

  enqueueGroup(commandIds);
  enqueueGroup(heavyDefenseIds);
  enqueueGroup(standardDefenseIds);
  enqueueGroup(resourceIds);
  enqueueGroup(armyIds);
  enqueueGroup(trapIds);

  const wallEntry = catalog.find((e) => e.buildingId === "wall");
  if (wallEntry) {
    wallCount = wallEntry.count;
  }

  // Row by row placement with compact grid layout
  let cursorX = 1;
  let cursorY = 1;
  let maxRowHeight = 0;
  let countIdx = 1;

  for (const item of itemQueue) {
    if (cursorX + item.w > GRID_SIZE - 1) {
      cursorX = 1;
      cursorY += maxRowHeight;
      maxRowHeight = 0;
    }

    // Ensure we don't encroach into the wall zone (y >= 31)
    if (cursorY + item.h > 31) {
      const pos = engine.findNearestFree(cursorX, 1, item.w, item.h);
      if (pos) {
        const instanceId = `${item.buildingId}_${countIdx++}`;
        engine.place(instanceId, item.buildingId, pos.x, pos.y, item.w, item.h);
        placed.push({ instanceId, buildingId: item.buildingId, x: pos.x, y: pos.y });
        continue;
      }
    }

    const instanceId = `${item.buildingId}_${countIdx++}`;
    engine.place(instanceId, item.buildingId, cursorX, cursorY, item.w, item.h);
    placed.push({ instanceId, buildingId: item.buildingId, x: cursorX, y: cursorY });

    cursorX += item.w;
    if (item.h > maxRowHeight) maxRowHeight = item.h;
  }

  // Wall placement
  const wallGen = new WallGenerator(engine, ctx.prng);
  const walls = wallGen.generateWalls({
    purpose: "progress",
    wallCount,
    townHallLevel,
  });
  placed.push(...walls);

  return placed;
}

/**
 * -----------------------------------------------------------------------------
 * PIPELINE B: SHOWCASE / ART BASE (Symmetric, Geometric, Aesthetic)
 * -----------------------------------------------------------------------------
 */
function buildShowcaseBase(ctx: PipelineContext): PlacedBuilding[] {
  const { engine, prng, townHallLevel, pattern = "symmetric-axial" } = ctx;
  const catalog = getTownHallCatalog(townHallLevel);
  const placed: PlacedBuilding[] = [];
  const center = Math.floor(GRID_SIZE / 2); // 22

  let wallCount = 0;
  const nonWallItems: Array<{ buildingId: string; w: number; h: number; category: string }> = [];

  for (const entry of catalog) {
    if (entry.buildingId === "wall") {
      wallCount = entry.count;
      continue;
    }
    for (let i = 0; i < entry.count; i++) {
      nonWallItems.push({
        buildingId: entry.buildingId,
        w: entry.width,
        h: entry.height,
        category: entry.category,
      });
    }
  }

  // Sort items: 4x4 first, then 3x3, 2x2, 1x1
  nonWallItems.sort((a, b) => b.w * b.h - a.w * a.h);

  // Group items by type to place symmetrically
  const itemsByType = new Map<string, Array<{ buildingId: string; w: number; h: number }>>();
  for (const it of nonWallItems) {
    const list = itemsByType.get(it.buildingId) || [];
    list.push(it);
    itemsByType.set(it.buildingId, list);
  }

  let countIdx = 1;

  // Place core singletons on mirror axis
  const singleCenterIds = [
    "town-hall",
    "eagle-artillery",
    "clan-castle",
    "hero-hall",
    "dark-elixir-storage",
    "tornado-trap",
    "giga-bomb",
  ];

  let centralY = center - 14;
  for (const id of singleCenterIds) {
    const list = itemsByType.get(id);
    if (list && list.length % 2 === 1) {
      const item = list.pop()!;
      const cx = center - Math.floor(item.w / 2);
      const targetY = Math.min(GRID_SIZE - item.h - 2, centralY);
      const pos = engine.findNearestFree(cx, targetY, item.w, item.h);
      if (pos) {
        const instanceId = `${item.buildingId}_${countIdx++}`;
        engine.place(instanceId, item.buildingId, pos.x, pos.y, item.w, item.h);
        placed.push({ instanceId, buildingId: item.buildingId, x: pos.x, y: pos.y });
        centralY += item.h + 2;
      }
    }
  }

  // Place remaining items as symmetric pairs across center axis (Y-axis mirror: x' = 44 - w - x)
  for (const [buildingId, items] of itemsByType.entries()) {
    while (items.length >= 2) {
      const it1 = items.pop()!;
      const it2 = items.pop()!;

      // Find spot on left side
      const targetDist = 4 + (countIdx % 15);
      const targetAngle = (countIdx * 0.6) % (Math.PI * 2);
      const tx = Math.max(2, Math.min(center - it1.w - 1, center - Math.round(Math.cos(targetAngle) * targetDist)));
      const ty = Math.max(2, Math.min(GRID_SIZE - it1.h - 2, center + Math.round(Math.sin(targetAngle) * targetDist)));

      const pos1 = engine.findNearestFree(tx, ty, it1.w, it1.h);
      if (pos1) {
        const inst1 = `${it1.buildingId}_${countIdx++}`;
        engine.place(inst1, it1.buildingId, pos1.x, pos1.y, it1.w, it1.h);
        placed.push({ instanceId: inst1, buildingId: it1.buildingId, x: pos1.x, y: pos1.y });

        // Mirrored position on right side
        const mirrorX = GRID_SIZE - it2.w - pos1.x;
        const pos2 = engine.isFree(mirrorX, pos1.y, it2.w, it2.h)
          ? { x: mirrorX, y: pos1.y }
          : engine.findNearestFree(mirrorX, pos1.y, it2.w, it2.h);

        if (pos2) {
          const inst2 = `${it2.buildingId}_${countIdx++}`;
          engine.place(inst2, it2.buildingId, pos2.x, pos2.y, it2.w, it2.h);
          placed.push({ instanceId: inst2, buildingId: it2.buildingId, x: pos2.x, y: pos2.y });
        }
      }
    }

    // Single remainder if any
    while (items.length > 0) {
      const item = items.pop()!;
      const pos = engine.findNearestFree(center - Math.floor(item.w / 2), center, item.w, item.h);
      if (pos) {
        const inst = `${item.buildingId}_${countIdx++}`;
        engine.place(inst, item.buildingId, pos.x, pos.y, item.w, item.h);
        placed.push({ instanceId: inst, buildingId: item.buildingId, x: pos.x, y: pos.y });
      }
    }
  }

  // Generate artistic outline walls
  const wallGen = new WallGenerator(engine, prng);
  const walls = wallGen.generateWalls({
    purpose: "showcase",
    pattern,
    wallCount,
    townHallLevel,
  });
  placed.push(...walls);

  return placed;
}

/**
 * -----------------------------------------------------------------------------
 * PIPELINE C: TACTICAL BASE (War, Trophy, Farming, Hybrid)
 * -----------------------------------------------------------------------------
 */
function buildTacticalBase(ctx: PipelineContext): PlacedBuilding[] {
  const { engine, prng, townHallLevel, purpose } = ctx;
  const catalog = getTownHallCatalog(townHallLevel);
  const placed: PlacedBuilding[] = [];
  const profile = STRATEGY_PROFILES[purpose] || STRATEGY_PROFILES.war;
  const center = Math.floor(GRID_SIZE / 2); // 22

  let wallCount = 0;
  const catalogMap = new Map<string, TownHallBuildingEntry>();

  for (const entry of catalog) {
    if (entry.buildingId === "wall") {
      wallCount = entry.count;
    } else {
      catalogMap.set(entry.buildingId, entry);
    }
  }

  let countIdx = 1;

  // Helper to place N instances of a building type with custom positioning logic
  function placeInstances(
    buildingId: string,
    targetPositions: Array<{ x: number; y: number }>,
    spacingRequirement: number = 0
  ) {
    const entry = catalogMap.get(buildingId);
    if (!entry) return;

    for (let i = 0; i < entry.count; i++) {
      const ideal = targetPositions[i % targetPositions.length];
      const targetX = ideal ? ideal.x : center;
      const targetY = ideal ? ideal.y : center;

      let chosenPos: { x: number; y: number } | null = null;

      if (spacingRequirement > 0) {
        chosenPos = engine.findBestPosition(
          entry.width,
          entry.height,
          (x, y) => {
            const distToSame = engine.minDistanceToCategory(
              x,
              y,
              entry.width,
              entry.height,
              (b) => b.buildingId === buildingId
            );
            const distToIdeal = Math.hypot(x - targetX, y - targetY);
            return distToSame * 2 - distToIdeal;
          }
        );
      } else {
        chosenPos = engine.findNearestFree(targetX, targetY, entry.width, entry.height);
      }

      if (chosenPos) {
        const instanceId = `${buildingId}_${countIdx++}`;
        engine.place(instanceId, buildingId, chosenPos.x, chosenPos.y, entry.width, entry.height);
        placed.push({ instanceId, buildingId, x: chosenPos.x, y: chosenPos.y });
      }
    }
    catalogMap.delete(buildingId);
  }

  // --- Step 1: Place Core Anchor Buildings ---
  // Town Hall
  let thTarget = { x: center - 2, y: center - 2 };
  if (profile.townHallPlacement === "off-center") {
    thTarget = { x: center - 6, y: center - 6 };
  } else if (profile.townHallPlacement === "semi-exposed") {
    thTarget = { x: center - 2, y: center - 10 };
  }
  placeInstances("town-hall", [thTarget]);

  // Clan Castle (Dead center for maximum unlureable defense)
  placeInstances("clan-castle", [{ x: center - 1, y: center - 1 }]);

  // Eagle Artillery (Opposite of TH in War, or Core in Trophy)
  let eagleTarget = { x: center + 3, y: center + 3 };
  if (profile.eaglePlacement === "core") {
    eagleTarget = { x: center - 2, y: center + 3 };
  }
  placeInstances("eagle-artillery", [eagleTarget]);

  // Hero Hall & Monolith
  placeInstances("hero-hall", [{ x: center + 2, y: center - 5 }]);
  placeInstances("monolith", [{ x: center - 5, y: center + 3 }]);

  // --- Step 2: Place Tier 1 Key Defenses (Infernos, X-Bows, Scattershots, Spell Towers) ---
  const quadAngles = [
    { x: center - 8, y: center - 8 },
    { x: center + 6, y: center - 8 },
    { x: center - 8, y: center + 6 },
    { x: center + 6, y: center + 6 },
  ];
  placeInstances("inferno-tower", quadAngles, profile.infernoSpacingMin);
  placeInstances("xbow", [
    { x: center - 5, y: center },
    { x: center + 4, y: center },
    { x: center, y: center - 5 },
    { x: center, y: center + 4 },
  ], 2);
  placeInstances("scattershot", [
    { x: center - 9, y: center },
    { x: center + 7, y: center },
  ], 3);
  placeInstances("spell-tower", [
    { x: center - 4, y: center - 4 },
    { x: center + 3, y: center + 3 },
  ]);
  placeInstances("multi-archer-tower", [
    { x: center - 10, y: center - 4 },
    { x: center + 8, y: center + 4 },
  ]);
  placeInstances("ricochet-cannon", [
    { x: center - 4, y: center + 8 },
    { x: center + 4, y: center - 10 },
  ]);
  placeInstances("firespitter", [
    { x: center - 9, y: center + 5 },
    { x: center + 7, y: center - 5 },
  ]);

  // --- Step 3: Air & Splash Defenses (ADs, Wizard Towers, Bomb Towers, Air Sweepers) ---
  // Air Defenses in balanced diamond/quad surrounding core
  placeInstances("air-defense", [
    { x: center - 9, y: center - 7 },
    { x: center + 7, y: center - 7 },
    { x: center - 7, y: center + 7 },
    { x: center + 7, y: center + 7 },
  ], 3);
  placeInstances("wizard-tower", [
    { x: center - 11, y: center - 3 },
    { x: center + 9, y: center - 3 },
    { x: center - 3, y: center + 9 },
    { x: center + 3, y: center - 11 },
    { x: center - 9, y: center + 9 },
  ], 2);
  placeInstances("air-sweeper", [
    { x: center - 3, y: center - 2 },
    { x: center + 2, y: center + 1 },
  ]);
  placeInstances("bomb-tower", [
    { x: center - 7, y: center + 2 },
    { x: center + 5, y: center - 2 },
  ]);

  // --- Step 4: Resources (Storages buffer defenses in War, or spread in Farming) ---
  const storageTargets =
    profile.storageStrategy === "spread-quadrants"
      ? [
          { x: center - 12, y: center - 12 },
          { x: center + 10, y: center - 12 },
          { x: center - 12, y: center + 10 },
          { x: center + 10, y: center + 10 },
        ]
      : [
          { x: center - 8, y: center - 3 },
          { x: center + 6, y: center - 3 },
          { x: center - 3, y: center + 6 },
          { x: center + 3, y: center - 8 },
        ];

  placeInstances("dark-elixir-storage", [{ x: center - 2, y: center + 2 }]);
  placeInstances("gold-storage", storageTargets);
  placeInstances("elixir-storage", storageTargets.map((p) => ({ x: p.y, y: p.x })));

  // --- Step 5: Secondary Defenses (Teslas, Cannons, Mortars, Archer Towers) ---
  placeInstances("hidden-tesla", [
    { x: center - 4, y: center - 7 },
    { x: center + 3, y: center - 7 },
    { x: center - 4, y: center + 6 },
    { x: center + 3, y: center + 6 },
    { x: center, y: center - 8 },
  ]);
  placeInstances("mortar", [
    { x: center - 13, y: center - 5 },
    { x: center + 11, y: center - 5 },
    { x: center - 5, y: center + 11 },
    { x: center + 5, y: center - 13 },
  ]);

  // Point defenses around mid-perimeter
  const midPoints: Array<{ x: number; y: number }> = [];
  for (let a = 0; a < 8; a++) {
    const angle = (a * Math.PI) / 4;
    midPoints.push({
      x: center + Math.round(Math.cos(angle) * 12),
      y: center + Math.round(Math.sin(angle) * 12),
    });
  }
  placeInstances("cannon", midPoints);
  placeInstances("archer-tower", midPoints.map((p) => ({ x: p.x + 2, y: p.y - 2 })));

  // --- Step 6: Army & Resource Production Perimeter ---
  const outerRings: Array<{ x: number; y: number }> = [];
  for (let a = 0; a < 16; a++) {
    const angle = (a * Math.PI) / 8;
    outerRings.push({
      x: center + Math.round(Math.cos(angle) * 16),
      y: center + Math.round(Math.sin(angle) * 16),
    });
  }

  placeInstances("army-camp", [
    { x: center - 14, y: center - 14 },
    { x: center + 11, y: center - 14 },
    { x: center - 14, y: center + 11 },
    { x: center + 11, y: center + 11 },
  ]);
  placeInstances("hero-banner", [
    { x: center - 5, y: center - 5 },
    { x: center + 4, y: center - 5 },
    { x: center - 5, y: center + 4 },
    { x: center + 4, y: center + 4 },
  ]);
  placeInstances("helper-hut", [{ x: center - 1, y: center - 4 }]);
  placeInstances("builder-hut", [
    { x: center - 16, y: center - 16 },
    { x: center + 15, y: center - 16 },
    { x: center - 16, y: center + 15 },
    { x: center + 15, y: center + 15 },
    { x: center, y: center - 16 },
  ]);

  // Production
  placeInstances("dark-elixir-drill", outerRings);
  placeInstances("gold-mine", outerRings);
  placeInstances("elixir-collector", outerRings);

  // Remaining army
  placeInstances("barracks", outerRings);
  placeInstances("dark-barracks", outerRings);
  placeInstances("laboratory", outerRings);
  placeInstances("spell-factory", outerRings);
  placeInstances("dark-spell-factory", outerRings);
  placeInstances("blacksmith", outerRings);
  placeInstances("workshop", outerRings);
  placeInstances("pet-house", outerRings);

  // --- Step 7: Place Walls (All walls guaranteed) ---
  const wallGen = new WallGenerator(engine, prng);
  const walls = wallGen.generateWalls({
    purpose,
    wallCount,
    townHallLevel,
  });
  placed.push(...walls);

  // --- Step 8: Place Traps into Tactical Gaps ---
  // Giant bombs & Giga bomb in gaps between defenses
  placeInstances("giant-bomb", [
    { x: center - 7, y: center - 4 },
    { x: center + 6, y: center - 4 },
    { x: center - 7, y: center + 4 },
    { x: center + 6, y: center + 4 },
    { x: center, y: center + 7 },
  ]);
  placeInstances("giga-bomb", [{ x: center - 1, y: center + 5 }]);
  placeInstances("tornado-trap", [{ x: center - 2, y: center }]);
  placeInstances("spring-trap", midPoints);
  placeInstances("seeking-air-mine", [
    { x: center - 8, y: center - 8 },
    { x: center + 8, y: center - 8 },
    { x: center - 8, y: center + 8 },
    { x: center + 8, y: center + 8 },
  ]);
  placeInstances("air-bomb", midPoints);
  placeInstances("skeleton-trap", [
    { x: center - 3, y: center - 3 },
    { x: center + 3, y: center - 3 },
    { x: center, y: center + 4 },
  ]);
  placeInstances("bomb", outerRings);

  // Final check: In case any remaining items were left in catalogMap, place them in free spots
  for (const [buildingId, entry] of catalogMap.entries()) {
    for (let i = 0; i < entry.count; i++) {
      const pos = engine.findNearestFree(center, center, entry.width, entry.height);
      if (pos) {
        const instanceId = `${buildingId}_${countIdx++}`;
        engine.place(instanceId, buildingId, pos.x, pos.y, entry.width, entry.height);
        placed.push({ instanceId, buildingId, x: pos.x, y: pos.y });
      }
    }
  }

  return placed;
}

/**
 * -----------------------------------------------------------------------------
 * SCORING SYSTEM
 * -----------------------------------------------------------------------------
 */
function computeBaseScore(
  buildings: PlacedBuilding[],
  thLevel: number,
  purpose: BasePurpose
): BaseScore {
  const profile = STRATEGY_PROFILES[purpose] || STRATEGY_PROFILES.war;
  const weights = profile.scoreWeights;

  const center = GRID_SIZE / 2;

  // 1. Completeness & Validity
  const validation = validateGeneratedBase(buildings, thLevel);
  const completeness = validation.isComplete;
  const validity = validation.isValid;

  // 2. Symmetry (calculate difference across vertical axis)
  let symmetryMatches = 0;
  let nonWallCount = 0;
  for (const b of buildings) {
    if (b.buildingId === "wall") continue;
    nonWallCount++;
    const mirrorX = GRID_SIZE - (b.buildingId === "town-hall" ? 4 : 3) - b.x;
    const hasMirror = buildings.some(
      (m) =>
        m.buildingId === b.buildingId &&
        Math.abs(m.x - mirrorX) <= 2 &&
        Math.abs(m.y - b.y) <= 2
    );
    if (hasMirror) symmetryMatches++;
  }
  const symmetry = nonWallCount > 0 ? Math.round((symmetryMatches / nonWallCount) * 100) : 100;

  // 3. Defensive Spacing (Reward >= 2 tile gaps between core defenses)
  const coreDefenses = buildings.filter((b) =>
    ["inferno-tower", "xbow", "eagle-artillery", "monolith", "scattershot"].includes(b.buildingId)
  );
  let closePairs = 0;
  for (let i = 0; i < coreDefenses.length; i++) {
    for (let j = i + 1; j < coreDefenses.length; j++) {
      const d = Math.hypot(coreDefenses[i].x - coreDefenses[j].x, coreDefenses[i].y - coreDefenses[j].y);
      if (d < 3.5) closePairs++;
    }
  }
  const defensiveSpacing = Math.max(40, Math.min(100, 100 - closePairs * 12));

  // 4. Air Coverage
  const ads = buildings.filter((b) => b.buildingId === "air-defense");
  const airCoverage = ads.length >= 3 ? 92 : ads.length * 25;

  // 5. Splash Coverage
  const splash = buildings.filter((b) =>
    ["wizard-tower", "bomb-tower", "scattershot"].includes(b.buildingId)
  );
  const splashCoverage = Math.min(100, 60 + splash.length * 5);

  // 6. Resource Protection (Spread of storages)
  const storages = buildings.filter((b) =>
    ["gold-storage", "elixir-storage", "dark-elixir-storage"].includes(b.buildingId)
  );
  let avgStorageSpread = 0;
  if (storages.length > 1) {
    let totalD = 0;
    for (let i = 0; i < storages.length; i++) {
      for (let j = i + 1; j < storages.length; j++) {
        totalD += Math.hypot(storages[i].x - storages[j].x, storages[i].y - storages[j].y);
      }
    }
    avgStorageSpread = totalD / ((storages.length * (storages.length - 1)) / 2);
  }
  const resourceProtection = Math.min(100, Math.round(avgStorageSpread * 5.5));

  // 7. Compartment Quality
  const wallCount = buildings.filter((b) => b.buildingId === "wall").length;
  const compartmentQuality = wallCount > 100 ? 90 : Math.round((wallCount / 100) * 90);

  // 8. Path Complexity
  const pathComplexity = purpose === "war" ? 94 : purpose === "progress" ? 20 : 85;

  // 9. Upgrade Accessibility
  const upgradeAccessibility = purpose === "progress" ? 98 : 45;

  // 10. Aesthetic Balance
  const aestheticBalance = purpose === "showcase" ? 96 : 80;

  // Weighted overall score
  const rawScore =
    symmetry * weights.symmetry +
    compartmentQuality * weights.compartmentQuality +
    defensiveSpacing * weights.defensiveSpacing +
    airCoverage * weights.airCoverage +
    splashCoverage * weights.splashCoverage +
    resourceProtection * weights.resourceProtection +
    pathComplexity * weights.pathComplexity +
    upgradeAccessibility * weights.upgradeAccessibility +
    aestheticBalance * weights.aestheticBalance;

  const overallScore = Math.round(Math.max(0, Math.min(100, rawScore)));

  let tier: "S" | "A" | "B" | "C" = "B";
  if (overallScore >= 90) tier = "S";
  else if (overallScore >= 80) tier = "A";
  else if (overallScore >= 70) tier = "B";
  else tier = "C";

  return {
    completeness,
    validity,
    symmetry,
    compartmentQuality,
    defensiveSpacing,
    airCoverage,
    splashCoverage,
    resourceProtection,
    pathComplexity,
    upgradeAccessibility,
    aestheticBalance,
    overallScore,
    tier,
    summary: `Base ${profile.name} đạt cấp ${tier} (${overallScore}/100 điểm) với đầy đủ 100% công trình và tường hợp lệ.`,
  };
}

function getEmptyScore(): BaseScore {
  return {
    completeness: false,
    validity: false,
    symmetry: 0,
    compartmentQuality: 0,
    defensiveSpacing: 0,
    airCoverage: 0,
    splashCoverage: 0,
    resourceProtection: 0,
    pathComplexity: 0,
    upgradeAccessibility: 0,
    aestheticBalance: 0,
    overallScore: 0,
    tier: "C",
    summary: "Bản đồ chưa hợp lệ hoặc chưa được tạo thành công.",
  };
}
