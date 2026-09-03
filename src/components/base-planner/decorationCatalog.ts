/**
 * Cosmetic Decoration Catalog
 * ---------------------------
 * Purely visual objects a player can scatter around their base (trees, statues,
 * banners...). Deliberately NOT part of `BUILDINGS_CATALOG` / `BuildingCategory`:
 * they carry no gameplay stats and must never influence defense scoring, the
 * deployment-zone engine, or the auto-generator's required-building counts.
 * See `PlacedDecoration` / `DecorationDef` in types.ts.
 */
import type { DecorationDef } from "./types";

export const DECORATIONS_CATALOG: DecorationDef[] = [
  {
    id: "deco-pine-tree",
    name: "Cây thông",
    width: 1,
    height: 1,
    color: "#1e6b3a",
    accentColor: "#2f9653",
    emoji: "🌲",
    description: "Cây thông xanh trang trí viền base",
  },
  {
    id: "deco-bush",
    name: "Bụi cây",
    width: 1,
    height: 1,
    color: "#3d8b3d",
    accentColor: "#5cb85c",
    emoji: "🌳",
    description: "Bụi cây rậm rạp lấp khoảng trống",
  },
  {
    id: "deco-flower",
    name: "Chậu hoa",
    width: 1,
    height: 1,
    color: "#c2437a",
    accentColor: "#ef7fae",
    emoji: "🌸",
    description: "Chậu hoa nhỏ điểm xuyết sắc màu",
  },
  {
    id: "deco-statue",
    name: "Tượng đài",
    width: 2,
    height: 2,
    color: "#8a7a5c",
    accentColor: "#c9b896",
    emoji: "🗿",
    description: "Tượng đá cổ uy nghiêm",
  },
  {
    id: "deco-fountain",
    name: "Đài phun nước",
    width: 2,
    height: 2,
    color: "#2874a6",
    accentColor: "#5dade2",
    emoji: "⛲",
    description: "Đài phun nước làm điểm nhấn trung tâm",
  },
  {
    id: "deco-lantern",
    name: "Đèn lồng",
    width: 1,
    height: 1,
    color: "#c0392b",
    accentColor: "#f39c12",
    emoji: "🏮",
    description: "Đèn lồng thắp sáng lối đi",
  },
  {
    id: "deco-torch",
    name: "Đuốc lửa",
    width: 1,
    height: 1,
    color: "#7f5539",
    accentColor: "#f39c12",
    emoji: "🔥",
    description: "Đuốc cháy dọc tường thành",
  },
  {
    id: "deco-flag",
    name: "Cờ hiệu",
    width: 1,
    height: 1,
    color: "#1f618d",
    accentColor: "#5dade2",
    emoji: "🚩",
    description: "Cờ hiệu phe phái",
  },
  {
    id: "deco-rock",
    name: "Đá cảnh",
    width: 1,
    height: 1,
    color: "#616a6b",
    accentColor: "#aab7b8",
    emoji: "🪨",
    description: "Đá cảnh tự nhiên",
  },
  {
    id: "deco-gate",
    name: "Cổng chào",
    width: 2,
    height: 1,
    color: "#a04000",
    accentColor: "#e59866",
    emoji: "⛩️",
    description: "Cổng trang trí lối vào base",
  },
];

export const DECORATIONS_BY_ID = new Map<string, DecorationDef>(
  DECORATIONS_CATALOG.map((d) => [d.id, d])
);
