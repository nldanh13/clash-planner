import type { UpgradeItem } from "../upgradeData";

export type VillagePasteChange = {
  id: string;
  name: string;
  kind: UpgradeItem["kind"];
  before: number;
  after: number;
};

export type VillagePasteData = {
  levels: Map<number, number>;
  builderBaseIds: Set<number>;
  total: number;
};

export type VillagePasteReport = {
  error?: string;
  changes?: VillagePasteChange[];
  total?: number;
  recognized?: number;
  updated?: number;
  unchanged?: number;
  wallSkipped?: number;
  builderBaseSkipped?: number;
  unsupportedSkipped?: number;
};

export function clampInteger(value: unknown, min: number, max: number, fallback = min) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

export function extractDataLevels(raw: string): VillagePasteData {
  const start = raw.indexOf("{"),
    end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start)
    throw new Error("Không tìm thấy dữ liệu JSON hợp lệ trong nội dung đã dán.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    throw new Error(
      "Dữ liệu dán vào không phải JSON hợp lệ. Hãy dán đúng nội dung đã Copy ở Cài đặt > More Settings > Data Export trong game."
    );
  }
  const levels = new Map<number, number>();
  const builderBaseIds = new Set<number>();
  let total = 0;
  const walk = (node: unknown, path: string[]) => {
    if (Array.isArray(node)) {
      for (const child of node) walk(child, path);
      return;
    }
    if (node && typeof node === "object") {
      const obj = node as Record<string, unknown>;
      if (
        typeof obj.data === "number" &&
        Number.isFinite(obj.data) &&
        typeof obj.lvl === "number" &&
        Number.isFinite(obj.lvl)
      ) {
        total++;
        const dataId = Math.trunc(obj.data),
          level = Math.max(0, Math.trunc(obj.lvl));
        const isBuilderBase = path.some(
          (key) =>
            /builder.?base/i.test(key) || /^(buildings|traps|obstacles|decorations|decos)2$/i.test(key)
        );
        if (isBuilderBase) builderBaseIds.add(dataId);
        else {
          const prev = levels.get(dataId);
          if (prev === undefined || level < prev) levels.set(dataId, level);
        }
      }
      for (const key of Object.keys(obj)) walk(obj[key], [...path, key]);
    }
  };
  walk(parsed, []);
  return { levels, builderBaseIds, total };
}
