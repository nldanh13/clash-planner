import { imageCache, preloadImage, getCachedImage, hasFailed } from "./imageCache";
import { BUILDINGS_CATALOG } from "./constants";
import { getEffectiveBuildingLevel, getMaxBuildingLevel } from "./buildingLevels";

export { getCachedImage, preloadImage };

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

