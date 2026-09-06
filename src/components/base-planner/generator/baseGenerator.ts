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
import { generateCompartmentLayout, type Rect } from "./compartmentGenerator";
import { validateGeneratedBase } from "./generatorValidator";
import { STRATEGY_PROFILES } from "./strategyProfiles";
import { computeDeploymentAnalysis } from "../deploymentZones";
import { computeDeploymentRisk, isDeploymentReadyForPurpose } from "../deploymentRisk";
import { suggestDeploymentAutoFix } from "../deploymentAutoFix";

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
        // Deployment Zone pass: for tactical purposes, try to close any dangerous
        // internal deployment holes the placement pipeline left behind before
        // scoring. This never adds/removes buildings and is rejected outright
        // (see suggestDeploymentAutoFix) if it would drop the base's own defense
        // score or fails structural re-validation — the placement pipeline itself
        // is not deployment-mask-aware, this is a bounded post-pass on top of it.
        let finalBuildings = buildings;
        let finalStats = validation.stats;
        let finalWarnings = validation.warnings;

        if (purpose === "war" || purpose === "trophy" || purpose === "hybrid") {
          const fix = suggestDeploymentAutoFix(buildings, thLevel, purpose);
          if (fix.applied) {
            const revalidation = validateGeneratedBase(fix.updatedBuildings, thLevel);
            if (revalidation.isValid && revalidation.isComplete) {
              finalBuildings = fix.updatedBuildings;
              finalStats = revalidation.stats;
              if (fix.resolvedHoleCount > 0) {
                finalWarnings = [
                  ...finalWarnings,
                  `Đã tự động đóng ${fix.resolvedHoleCount} lỗ thả quân nguy hiểm trong quá trình tạo base.`,
                ];
              }
            }
          }
        }

        const score = computeBaseScore(finalBuildings, thLevel, purpose);
        result = {
          success: true,
          buildings: finalBuildings,
          townHallLevel: thLevel,
          purpose,
          pattern,
          seed: actualSeed,
          stats: finalStats,
          score,
          warnings: finalWarnings,
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

  // --- Step 0: Build a real compartment layout and place its walls FIRST ---
  // Every building placement below targets a specific compartment's center
  // and lets findNearestFree/findBestPosition land it inside that
  // compartment's already-placed walls — so a wall boundary's implied
  // protection is actually true. The old pipeline placed every building at
  // an absolute coordinate first, then drew a fixed core box + 8 hardcoded
  // wing/corner rectangles afterward with no idea where anything had
  // landed, which is why compartments didn't reliably contain what they
  // were supposed to and Town Hall had no guaranteed wall-layer depth.
  const layout = generateCompartmentLayout(wallCount);
  const wallGen = new WallGenerator(engine, prng);
  const walls = wallGen.placeCompartmentWalls(layout.wallTiles, wallCount);
  placed.push(...walls);

  const rectCenter = (r: Rect) => ({ x: Math.round(r.x + r.w / 2), y: Math.round(r.y + r.h / 2) });
  const coreCenter = rectCenter(layout.core);

  // Round-robin cursor SHARED across every S-tier / splash-vulnerable
  // building type placed below. Advancing it globally — not resetting it
  // per building type — is what actually spreads DIFFERENT high-value
  // defenses across DIFFERENT compartments: the first Inferno Tower takes
  // compartment 0, the first X-Bow takes compartment 1, and so on, instead
  // of every type independently gravitating toward the same "ideal" spot
  // and clustering several splash-vulnerable buildings in one compartment
  // where a single spell or splash unit could hit them all.
  let compartmentCursor = 0;
  const nextCompartmentTargets = (
    count: number,
    w: number,
    h: number
  ): Array<{ x: number; y: number }> => {
    if (layout.compartments.length === 0) {
      return [{ x: coreCenter.x - Math.round(w / 2), y: coreCenter.y - Math.round(h / 2) }];
    }
    const targets: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < count; i++) {
      const rect = layout.compartments[compartmentCursor % layout.compartments.length];
      compartmentCursor++;
      targets.push({
        x: Math.round(rect.x + rect.w / 2 - w / 2),
        y: Math.round(rect.y + rect.h / 2 - h / 2),
      });
    }
    return targets;
  };

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

  // --- Step 1: Core Anchor Buildings — inside the double-walled core ---
  // Placed explicitly side by side from the core's own interior corner
  // (not both targeting the same center point) — a Town Hall centered in
  // the core already consumes the middle of the interior, leaving only a
  // margin too thin on every side for Clan Castle to also fit; seating
  // them next to each other instead guarantees both stay inside as long as
  // the interior is wide enough for their combined width (see coreSize).
  const thEntry = catalogMap.get("town-hall");
  const thWH = thEntry ? { w: thEntry.width, h: thEntry.height } : { w: 4, h: 4 };
  const interiorX0 = layout.core.x + 1;
  const interiorY0 = layout.core.y + 1;
  placeInstances("town-hall", [{ x: interiorX0, y: interiorY0 }]);
  placeInstances("clan-castle", [{ x: interiorX0 + thWH.w, y: interiorY0 }]);

  // Eagle Artillery: "core" profiles (Trophy/Showcase) seat it with Town
  // Hall behind the double ring; everything else treats it as a normal
  // S-tier defense in Step 2 below, spread out like the others.
  if (profile.eaglePlacement === "core") {
    placeInstances("eagle-artillery", [{ x: interiorX0, y: interiorY0 + thWH.h }]);
  }

  // --- Step 2: S-tier defenses — one per compartment via the shared
  // cursor, so no two of these end up sharing a compartment until every
  // compartment already has one. ---
  const sTierIds = [
    "eagle-artillery", // only reaches here if not already seated in the core above
    "inferno-tower",
    "xbow",
    "scattershot",
    "monolith",
    "spell-tower",
    "multi-archer-tower",
    "ricochet-cannon",
    "firespitter",
    "hero-hall",
  ];
  for (const id of sTierIds) {
    const entry = catalogMap.get(id);
    if (!entry) continue;
    const targets = nextCompartmentTargets(entry.count, entry.width, entry.height);
    placeInstances(id, targets, profile.infernoSpacingMin || 2);
  }

  // --- Step 3: Splash-vulnerable defenses — same shared cursor, so (say) a
  // Wizard Tower and a Mortar don't both default into the same compartment
  // as each other or as a Step-2 defense either. ---
  const splashTierIds = ["air-defense", "wizard-tower", "bomb-tower", "hidden-tesla", "mortar", "air-sweeper"];
  for (const id of splashTierIds) {
    const entry = catalogMap.get(id);
    if (!entry) continue;
    const targets = nextCompartmentTargets(entry.count, entry.width, entry.height);
    placeInstances(id, targets, 2);
  }

  // --- Step 4: Resources — spread storages across compartments too,
  // buffered by whatever defenses Steps 2-3 already seated there. ---
  placeInstances("dark-elixir-storage", [coreCenter]);
  const goldTargets = nextCompartmentTargets(
    catalogMap.get("gold-storage")?.count ?? 0,
    catalogMap.get("gold-storage")?.width ?? 3,
    catalogMap.get("gold-storage")?.height ?? 3
  );
  placeInstances("gold-storage", goldTargets);
  const elixirTargets = nextCompartmentTargets(
    catalogMap.get("elixir-storage")?.count ?? 0,
    catalogMap.get("elixir-storage")?.width ?? 3,
    catalogMap.get("elixir-storage")?.height ?? 3
  );
  placeInstances("elixir-storage", elixirTargets);

  // --- Step 5: Everything else (army, production, hero support) — in the
  // map's outer buffer ring outside the compartment grid. Real bases don't
  // wall-protect farms/army nearly as tightly as core defenses, so this
  // deliberately isn't compartment-cycled. ---
  const outerRings: Array<{ x: number; y: number }> = [];
  for (let a = 0; a < 16; a++) {
    const angle = (a * Math.PI) / 8;
    outerRings.push({
      x: center + Math.round(Math.cos(angle) * 19),
      y: center + Math.round(Math.sin(angle) * 19),
    });
  }
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
  placeInstances("army-camp", outerRings);
  placeInstances(
    "hero-banner",
    nextCompartmentTargets(
      catalogMap.get("hero-banner")?.count ?? 0,
      catalogMap.get("hero-banner")?.width ?? 2,
      catalogMap.get("hero-banner")?.height ?? 2
    )
  );
  placeInstances("helper-hut", [coreCenter]);
  placeInstances("builder-hut", outerRings);
  placeInstances("dark-elixir-drill", outerRings);
  placeInstances("gold-mine", outerRings);
  placeInstances("elixir-collector", outerRings);
  placeInstances("barracks", outerRings);
  placeInstances("dark-barracks", outerRings);
  placeInstances("laboratory", outerRings);
  placeInstances("spell-factory", outerRings);
  placeInstances("dark-spell-factory", outerRings);
  placeInstances("blacksmith", outerRings);
  placeInstances("workshop", outerRings);
  placeInstances("pet-house", outerRings);

  // --- Step 6: Traps into whatever gaps remain ---
  placeInstances(
    "giant-bomb",
    nextCompartmentTargets(catalogMap.get("giant-bomb")?.count ?? 0, 1, 1)
  );
  placeInstances("giga-bomb", [coreCenter]);
  placeInstances("tornado-trap", [coreCenter]);
  placeInstances("spring-trap", midPoints);
  placeInstances(
    "seeking-air-mine",
    nextCompartmentTargets(catalogMap.get("seeking-air-mine")?.count ?? 0, 1, 1)
  );
  placeInstances("air-bomb", midPoints);
  placeInstances(
    "skeleton-trap",
    nextCompartmentTargets(catalogMap.get("skeleton-trap")?.count ?? 0, 1, 1)
  );
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

  // Top up any wall shortfall now — only after every other building has
  // already claimed its cell, so this can never steal a cell (e.g. inside
  // the core) that a building still needed. See placeCompartmentWalls /
  // topUpWalls for why doing this any earlier is unsafe.
  placed.push(...wallGen.topUpWalls(walls.length, wallCount));

  return placed;
}

/**
 * Flood-fills the grid over wall-blocked cells to find real connected
 * compartments — the physical regions walls actually separate — instead of
 * inferring quality from a raw wall count or from a handful of hardcoded
 * "core defense" ids checked pairwise. Works from the final building list
 * alone, so it scores any layout correctly regardless of how (or whether)
 * it went through the compartment-aware generator, including a base a user
 * hand-edited afterward.
 */
function computeConnectedCompartments(buildings: PlacedBuilding[]): {
  meaningfulCompartments: PlacedBuilding[][];
} {
  const blocked = new Uint8Array(GRID_SIZE * GRID_SIZE);
  for (const b of buildings) {
    if (b.buildingId === "wall") blocked[b.y * GRID_SIZE + b.x] = 1;
  }

  const compId = new Int32Array(GRID_SIZE * GRID_SIZE).fill(-1);
  let nextId = 0;
  const stack: number[] = [];

  for (let start = 0; start < blocked.length; start++) {
    if (blocked[start] || compId[start] !== -1) continue;
    const id = nextId++;
    compId[start] = id;
    stack.push(start);
    while (stack.length > 0) {
      const cur = stack.pop()!;
      const cx = cur % GRID_SIZE;
      const cy = (cur - cx) / GRID_SIZE;
      const neighbors =
        cx + 1 < GRID_SIZE
          ? [cur + 1]
          : [];
      if (cx - 1 >= 0) neighbors.push(cur - 1);
      if (cy + 1 < GRID_SIZE) neighbors.push(cur + GRID_SIZE);
      if (cy - 1 >= 0) neighbors.push(cur - GRID_SIZE);
      for (const n of neighbors) {
        if (blocked[n] || compId[n] !== -1) continue;
        compId[n] = id;
        stack.push(n);
      }
    }
  }

  const byComponent = new Map<number, PlacedBuilding[]>();
  for (const b of buildings) {
    if (b.buildingId === "wall") continue;
    const id = compId[b.y * GRID_SIZE + b.x];
    if (id === -1) continue;
    const list = byComponent.get(id);
    if (list) list.push(b);
    else byComponent.set(id, [b]);
  }

  return { meaningfulCompartments: Array.from(byComponent.values()) };
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
  // Compartment membership (flood fill over wall-blocked cells) drives both
  // compartmentQuality and the anti-splash-clustering half of
  // defensiveSpacing below — computed once here from the actual final
  // layout so both metrics reflect real walled-off regions, not just a raw
  // wall tile count or distances between a handful of "core defense" ids.
  const { meaningfulCompartments } = computeConnectedCompartments(buildings);
  const highValueIds = new Set([
    "inferno-tower",
    "xbow",
    "eagle-artillery",
    "monolith",
    "scattershot",
    "spell-tower",
    "multi-archer-tower",
    "ricochet-cannon",
    "firespitter",
    "air-defense",
    "wizard-tower",
    "bomb-tower",
    "hidden-tesla",
    "mortar",
  ]);
  let overloadedCompartments = 0;
  for (const list of meaningfulCompartments) {
    if (list.filter((b) => highValueIds.has(b.buildingId)).length >= 2) overloadedCompartments++;
  }
  const defensiveSpacing = Math.max(20, Math.min(100, 100 - closePairs * 12 - overloadedCompartments * 10));

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

  // 7. Compartment Quality — how many genuinely separate, occupied
  // compartments the walls create (not just how many wall tiles exist,
  // which says nothing about whether they actually enclose anything). A
  // healthy tactical base has roughly 12-24 distinct compartments; fewer
  // means a few big, weakly-divided zones, so this rewards count up to
  // that range rather than an unbounded raw wall tally.
  const compartmentQuality = Math.round(Math.min(100, (meaningfulCompartments.length / 18) * 100));

  // 8. Path Complexity
  const pathComplexity = purpose === "war" ? 94 : purpose === "progress" ? 20 : 85;

  // 9. Upgrade Accessibility
  const upgradeAccessibility = purpose === "progress" ? 98 : 45;

  // 10. Aesthetic Balance
  const aestheticBalance = purpose === "showcase" ? 96 : 80;

  // 11. Deployment Zone Safety (see deploymentZones.ts / deploymentRisk.ts) —
  // the ONE place the generator's "how safe is this base to actually deploy
  // against" number comes from. Never recomputed ad hoc elsewhere.
  const deploymentAnalysis = computeDeploymentAnalysis(buildings);
  const deploymentRisk = computeDeploymentRisk(deploymentAnalysis, buildings, purpose);
  const deploymentSafety = deploymentRisk.deploymentSafetyScore;

  // Weighted overall score. Divide by the sum of weights actually used (rather
  // than assuming they sum to exactly 1) so adding deploymentSafety's weight
  // above doesn't silently bias every profile's score upward.
  const rawScore =
    symmetry * weights.symmetry +
    compartmentQuality * weights.compartmentQuality +
    defensiveSpacing * weights.defensiveSpacing +
    airCoverage * weights.airCoverage +
    splashCoverage * weights.splashCoverage +
    resourceProtection * weights.resourceProtection +
    pathComplexity * weights.pathComplexity +
    upgradeAccessibility * weights.upgradeAccessibility +
    aestheticBalance * weights.aestheticBalance +
    deploymentSafety * weights.deploymentSafety;

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0) || 1;
  const overallScore = Math.round(Math.max(0, Math.min(100, rawScore / totalWeight)));

  let tier: "S" | "A" | "B" | "C" = "B";
  if (overallScore >= 90) tier = "S";
  else if (overallScore >= 80) tier = "A";
  else if (overallScore >= 70) tier = "B";
  else tier = "C";

  // War/Trophy/Hybrid: never label a base "S"/"A" (optimal/ready) while it still
  // carries a critical deployment hole, no matter how high the raw score is.
  const deploymentReady = isDeploymentReadyForPurpose(deploymentAnalysis, buildings, purpose);
  if (!deploymentReady.ready && (tier === "S" || tier === "A")) {
    tier = "B";
  }

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
    deploymentSafety,
    overallScore,
    tier,
    summary: deploymentReady.ready
      ? `Base ${profile.name} đạt cấp ${tier} (${overallScore}/100 điểm) với đầy đủ 100% công trình và tường hợp lệ.`
      : `Base ${profile.name} đạt ${overallScore}/100 điểm nhưng bị giới hạn ở cấp ${tier} vì còn lỗ thả quân nguy hiểm gần lõi base (${deploymentReady.reason ?? ""}).`,
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
    deploymentSafety: 0,
    overallScore: 0,
    tier: "C",
    summary: "Bản đồ chưa hợp lệ hoặc chưa được tạo thành công.",
  };
}
