import { useEffect } from "react";
import { imageDb, townHallDb, setTownHallDb, mergeScrapedLevels } from "../services/gameDatabase";
import { townHallInfo as townHallInfoDefault } from "../townHallData";

export function useGameDatabase(onLoaded: () => void) {
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/data/images.json").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/data/townhalls.json").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/data/levels.json").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([images, townhalls, levelsDb]) => {
      if (cancelled) return;
      if (images && typeof images === "object") {
        Object.assign(imageDb, images);
      }
      if (Array.isArray(townhalls) && townhalls.length) {
        setTownHallDb(townhalls);
      }
      if (levelsDb && typeof levelsDb === "object") mergeScrapedLevels(levelsDb);
      onLoaded();
    });
    return () => {
      cancelled = true;
    };
  }, []);
}

export function getTownHallInfo() {
  return townHallDb || townHallInfoDefault;
}
