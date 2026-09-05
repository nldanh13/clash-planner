import { imageCache, preloadImage, getCachedImage, hasFailed } from "./imageCache";
import { BUILDINGS_CATALOG } from "./constants";
import { PlacedBuilding } from "./types";

export { getCachedImage, preloadImage };

export function getBuildingImagePath(buildingId: string, level?: number): string | null {
  if (buildingId === "town-hall") {
    const thLevel = level ?? 1;
    return `/town-halls/th-${Math.max(1, Math.min(18, thLevel))}.png`;
  }
  
  // Check heroes first
  const heroes = ["barbarian-king", "archer-queen", "minion-prince", "grand-warden", "royal-champion", "dragon-duke"];
  if (heroes.includes(buildingId)) {
    return `/heroes/${buildingId}.webp`;
  }
  
  // Special fallback or empty?
  if (buildingId === "hero-hall" || buildingId === "hero-banner" || buildingId === "helper-hut") {
    return null;
  }
  
  if (level) {
    return `/buildings/${buildingId}-${level}.png`;
  }
  return `/buildings/${buildingId}.png`;
}

/**
 * Resolves the image to draw for a placed building at its actual level, preferring
 * per-level art (`cannon-9.png`) but falling back to the flat catalog art
 * (`cannon.png`) whenever the specific level hasn't been drawn/downloaded yet —
 * many higher levels and newer defenses (monolith, spell-tower, ...) don't have
 * dedicated art in `public/buildings` yet.
 *
 * The leveled image is fetched lazily and cached under its own key; `onLoaded`
 * fires once it arrives so the caller can trigger a redraw to swap the fallback
 * art for the real one.
 */
export function getLeveledBuildingImage(
  buildingId: string,
  level: number | undefined,
  onLoaded?: () => void
): HTMLImageElement | undefined {
  if (buildingId === "town-hall") {
    const thLevel = Math.max(1, Math.min(18, level ?? 1));
    return getCachedImage(`town-hall-${thLevel}`);
  }

  const base = getCachedImage(buildingId);
  if (!level) return base;

  const leveledKey = `${buildingId}::L${level}`;
  const leveled = getCachedImage(leveledKey);
  if (leveled) return leveled;

  if (!hasFailed(leveledKey)) {
    preloadImage(leveledKey, `/buildings/${buildingId}-${level}.png`)
      .then(() => onLoaded?.())
      .catch(() => {});
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
