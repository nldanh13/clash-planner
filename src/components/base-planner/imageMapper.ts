import { imageCache, preloadImage, getCachedImage } from "./imageCache";
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

// Same logic but for rendering leveled if we add it in the future
export function getBuildingLeveledImagePath(buildingId: string, level?: number): string[] | null {
  const base = getBuildingImagePath(buildingId, level);
  if (!base) return null;
  if (buildingId === "town-hall" || base.includes("/heroes/")) {
    return [base];
  }
  if (level) {
    return [`/buildings/${buildingId}-${level}.png`, base];
  }
  return [base];
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
  for (let i = 1; i <= 17; i++) {
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
