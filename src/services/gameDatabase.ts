import { type TownHallInfo } from "../townHallData";
import { type Resource, type UpgradeItem, upgradeItems } from "../upgradeData";

export const imageDb: Record<string, string> = {};
export let townHallDb: TownHallInfo[] | null = null;

export function setTownHallDb(data: TownHallInfo[]) {
  townHallDb = data;
}

export type ScrapedLevelRow = {
  level: number;
  cost: number;
  timeHours: number;
  resource?: Resource;
  townHall?: number;
  labLevel?: number;
};

export function mergeScrapedLevels(levelsDb: Record<string, ScrapedLevelRow[]>) {
  for (const item of upgradeItems) {
    const scraped = levelsDb[item.id];
    if (!scraped || !scraped.length) continue;
    const byLevel = new Map(item.levels.map((l) => [l.level, l]));
    for (const row of scraped) {
      const existing = byLevel.get(row.level);
      if (existing) {
        existing.cost = row.cost;
        existing.timeHours = row.timeHours;
        if (row.resource) existing.resource = row.resource;
        if (row.townHall != null) existing.townHall = row.townHall;
      } else {
        byLevel.set(row.level, {
          level: row.level,
          townHall: row.townHall ?? item.levels.at(-1)?.townHall ?? item.unlockTownHall,
          cost: row.cost,
          resource: row.resource ?? item.levels[0]?.resource ?? "Gold",
          timeHours: row.timeHours,
        });
      }
    }
    item.levels = [...byLevel.values()].sort((a, b) => a.level - b.level);
    item.dataStatus = "exact";
    item.source = "Cào tự động từ coc.guide qua coc-admin/scrape.mjs --levels";
  }
}
