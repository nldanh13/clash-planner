import { imageCache, preloadImage, getCachedImage, hasFailed } from "./imageCache";
import { BUILDINGS_CATALOG } from "./constants";
import { getEffectiveBuildingLevel, getMaxBuildingLevel } from "./buildingLevels";
import type { PlacedBuilding } from "./types";

export { getCachedImage, preloadImage };

export const HERO_IDS = ["barbarian-king", "archer-queen", "minion-prince", "grand-warden", "royal-champion", "dragon-duke"];

/**
 * Looks up whatever's already cached for a placed building, using the exact
 * same key scheme preloadImagesForBuildings warms — town halls by TH level,
 * heroes by id, everything else by its effective per-level key falling back
 * to the base (non-leveled) key. Returns undefined if nothing's cached yet
 * (caller should await preloadImagesForBuildings first for a guaranteed
 * result, e.g. before a one-shot PNG export).
 */
export function resolveCachedBuildingImage(
  buildingId: string,
  level: number | undefined,
  townHallLevel: number
): HTMLImageElement | undefined {
  if (buildingId === "town-hall") {
    const lvl = Math.max(1, Math.min(18, townHallLevel));
    return getCachedImage(`town-hall-${lvl}`);
  }
  if (HERO_IDS.includes(buildingId)) {
    return getCachedImage(buildingId);
  }
  const effLevel = getEffectiveBuildingLevel(townHallLevel, buildingId, level);
  return getCachedImage(`${buildingId}::L${effLevel}`) || getCachedImage(buildingId);
}

/**
 * Awaits every image a given set of placed buildings needs before returning
 * — unlike getLeveledBuildingImage's fire-and-forget "return what's cached
 * now, redraw later when it arrives" pattern (built for a live canvas that
 * redraws on load), a one-shot PNG export has no later redraw to catch a
 * still-loading sprite, so it needs the cache to be fully warm *before* it
 * starts drawing. Safe to call even when everything is already cached —
 * preloadImage short-circuits instantly for cache hits.
 */
export async function preloadImagesForBuildings(
  buildings: PlacedBuilding[],
  townHallLevel: number
): Promise<void> {
  const jobs: Promise<unknown>[] = [];
  const seen = new Set<string>();

  const enqueue = (key: string, src: string, fallbackKey?: string, fallbackSrc?: string) => {
    if (seen.has(key)) return;
    seen.add(key);
    let job = preloadImage(key, src);
    if (fallbackKey && fallbackSrc) job = job.catch(() => preloadImage(fallbackKey, fallbackSrc));
    jobs.push(job.catch(() => {}));
  };

  for (const b of buildings) {
    if (b.buildingId === "town-hall") {
      const lvl = Math.max(1, Math.min(18, townHallLevel));
      enqueue(`town-hall-${lvl}`, `/town-halls/th-${lvl}.png`);
      continue;
    }
    if (HERO_IDS.includes(b.buildingId)) {
      enqueue(b.buildingId, `/heroes/${b.buildingId}.webp`);
      continue;
    }
    const effLevel = getEffectiveBuildingLevel(townHallLevel, b.buildingId, b.level);
    enqueue(
      `${b.buildingId}::L${effLevel}`,
      `/buildings/${b.buildingId}-${effLevel}.png`,
      b.buildingId,
      `/buildings/${b.buildingId}.png`
    );
  }

  await Promise.allSettled(jobs);
}

export function getBuildingImagePath(
  buildingId: string,
  level?: number,
  townHallLevel?: number
): string | null {
  const effLevel = townHallLevel
    ? getEffectiveBuildingLevel(townHallLevel, buildingId, level)
    : level;

  if (buildingId === "town-hall") {
    const thLevel = effLevel ?? townHallLevel ?? 1;
    return `/town-halls/th-${Math.max(1, Math.min(18, thLevel))}.png`;
  }
  
  // Check heroes first
  const heroes = ["barbarian-king", "archer-queen", "minion-prince", "grand-warden", "royal-champion", "dragon-duke"];
  if (heroes.includes(buildingId)) {
    return `/heroes/${buildingId}.webp`;
  }
  
  if (effLevel && effLevel > 0) {
    return `/buildings/${buildingId}-${effLevel}.png`;
  }
  return `/buildings/${buildingId}.png`;
}

/**
 * Resolves the image to draw for a placed building at its actual level, preferring
 * per-level art (`cannon-14.png`, `wall-12.png`) and falling back to base art
 * (`cannon.png`, `wall.png`) if the specific level isn't available.
 */
export function getLeveledBuildingImage(
  buildingId: string,
  level?: number,
  townHallLevel?: number,
  onLoaded?: () => void
): HTMLImageElement | undefined {
  const effLevel = townHallLevel
    ? getEffectiveBuildingLevel(townHallLevel, buildingId, level)
    : (level ?? 1);

  if (buildingId === "town-hall") {
    const thLevel = Math.max(1, Math.min(18, effLevel));
    const thImg = getCachedImage(`town-hall-${thLevel}`);
    if (thImg) return thImg;
    preloadImage(`town-hall-${thLevel}`, `/town-halls/th-${thLevel}.png`)
      .then(() => onLoaded?.())
      .catch(() => {});
    return undefined;
  }

  const base = getCachedImage(buildingId);
  const leveledKey = `${buildingId}::L${effLevel}`;
  const leveled = getCachedImage(leveledKey);
  if (leveled) return leveled;

  if (!hasFailed(leveledKey)) {
    preloadImage(leveledKey, `/buildings/${buildingId}-${effLevel}.png`)
      .then(() => onLoaded?.())
      .catch(() => {
        // Leveled image not found, fallback to base catalog image
        if (!getCachedImage(buildingId)) {
          preloadImage(buildingId, `/buildings/${buildingId}.png`)
            .then(() => onLoaded?.())
            .catch(() => {});
        }
      });
  }

  return base;
}

// Preload all base buildings to avoid flickering on first draw
export function preloadAllBaseImages(triggerRedraw?: () => void) {
  let loadedCount = 0;
  
  const handleLoad = () => {
    loadedCount++;
    if (triggerRedraw && loadedCount % 5 === 0) {
      triggerRedraw(); // Redraw periodically as images load
    }
  };

  // Preload town halls
  for (let i = 1; i <= 18; i++) {
    preloadImage(`town-hall-${i}`, `/town-halls/th-${i}.png`).then(handleLoad).catch(() => {});
  }
  for (const def of BUILDINGS_CATALOG) {
    if (def.id === "town-hall") continue;
    const src = getBuildingImagePath(def.id);
    if (src) {
      preloadImage(def.id, src).then(handleLoad).catch(() => {});
    }
  }
}

/**
 * Preload all leveled images for a specific Town Hall level.
 */
export function preloadTownHallBuildingImages(townHallLevel: number, onDone?: () => void) {
  const safeTH = Math.max(1, Math.min(18, townHallLevel));
  preloadImage(`town-hall-${safeTH}`, `/town-halls/th-${safeTH}.png`).catch(() => {});

  const promises: Promise<HTMLImageElement>[] = [];
  for (const def of BUILDINGS_CATALOG) {
    const lvl = getMaxBuildingLevel(safeTH, def.id);
    const key = `${def.id}::L${lvl}`;
    if (!getCachedImage(key) && !hasFailed(key)) {
      promises.push(preloadImage(key, `/buildings/${def.id}-${lvl}.png`).catch(() => {
        // Fallback to base
        return preloadImage(def.id, `/buildings/${def.id}.png`);
      }));
    }
  }

  Promise.allSettled(promises).then(() => {
    onDone?.();
  });
}

