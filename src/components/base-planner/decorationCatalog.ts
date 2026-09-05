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
import { vi } from "../../i18n/locales/vi";

export const DECORATIONS_CATALOG: DecorationDef[] = [
  {
    id: "deco-pine-tree",
    name: vi.decorationCatalog.pineTree.name,
    width: 1,
    height: 1,
    color: "#1e6b3a",
    accentColor: "#2f9653",
    emoji: "🌲",
    description: vi.decorationCatalog.pineTree.description,
  },
  {
    id: "deco-bush",
    name: vi.decorationCatalog.bush.name,
    width: 1,
    height: 1,
    color: "#3d8b3d",
    accentColor: "#5cb85c",
    emoji: "🌳",
    description: vi.decorationCatalog.bush.description,
  },
  {
    id: "deco-flower",
    name: vi.decorationCatalog.flower.name,
    width: 1,
    height: 1,
    color: "#c2437a",
    accentColor: "#ef7fae",
    emoji: "🌸",
    description: vi.decorationCatalog.flower.description,
  },
  {
    id: "deco-statue",
    name: vi.decorationCatalog.statue.name,
    width: 2,
    height: 2,
    color: "#8a7a5c",
    accentColor: "#c9b896",
    emoji: "🗿",
    description: vi.decorationCatalog.statue.description,
  },
  {
    id: "deco-fountain",
    name: vi.decorationCatalog.fountain.name,
    width: 2,
    height: 2,
    color: "#2874a6",
    accentColor: "#5dade2",
    emoji: "⛲",
    description: vi.decorationCatalog.fountain.description,
  },
  {
    id: "deco-lantern",
    name: vi.decorationCatalog.lantern.name,
    width: 1,
    height: 1,
    color: "#c0392b",
    accentColor: "#f39c12",
    emoji: "🏮",
    description: vi.decorationCatalog.lantern.description,
  },
  {
    id: "deco-torch",
    name: vi.decorationCatalog.torch.name,
    width: 1,
    height: 1,
    color: "#7f5539",
    accentColor: "#f39c12",
    emoji: "🔥",
    description: vi.decorationCatalog.torch.description,
  },
  {
    id: "deco-flag",
    name: vi.decorationCatalog.flag.name,
    width: 1,
    height: 1,
    color: "#1f618d",
    accentColor: "#5dade2",
    emoji: "🚩",
    description: vi.decorationCatalog.flag.description,
  },
  {
    id: "deco-rock",
    name: vi.decorationCatalog.rock.name,
    width: 1,
    height: 1,
    color: "#616a6b",
    accentColor: "#aab7b8",
    emoji: "🪨",
    description: vi.decorationCatalog.rock.description,
  },
  {
    id: "deco-gate",
    name: vi.decorationCatalog.gate.name,
    width: 2,
    height: 1,
    color: "#a04000",
    accentColor: "#e59866",
    emoji: "⛩️",
    description: vi.decorationCatalog.gate.description,
  },
];

export const DECORATIONS_BY_ID = new Map<string, DecorationDef>(
  DECORATIONS_CATALOG.map((d) => [d.id, d])
);
