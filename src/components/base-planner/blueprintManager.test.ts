// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  areLayoutNamesEqual,
  generateUniqueBlueprintName,
  hasPresetForTownHall,
  isLayoutNameDuplicate,
  METHOD_LABELS,
  migrateSavedLayouts,
  normalizeLayoutName,
  PURPOSE_LABELS,
} from "./blueprintUtils";
import {
  createNewLayout,
  deleteLayout,
  duplicateLayout,
  getActiveLayoutId,
  getSavedLayouts,
  renameLayout,
  saveLayout,
  setActiveLayoutId,
} from "./layoutStorage";
import type { LayoutProject } from "./types";
import { CURRENT_CATALOG_VERSION, getTownHallRequirements } from "./catalog";

describe("Catalog & Town Hall Object Counting (Mục 6)", () => {
  it("verifies that for every Town Hall (TH1-18), total objects exactly equals buildings + traps + walls", () => {
    for (let th = 1; th <= 18; th++) {
      const reqs = getTownHallRequirements(th);
      const calculatedTotal = reqs.buildings + reqs.traps + reqs.walls;
      expect(calculatedTotal).toBe(reqs.total);
    }
  });

  it("verifies TH8 specific counts from catalog and ensures total equals sum of three groups", () => {
    const th8 = getTownHallRequirements(8);
    expect(th8.buildings).toBe(65);
    expect(th8.traps).toBe(25);
    expect(th8.walls).toBe(225);
    expect(th8.total).toBe(315);
    expect(th8.total).toBe(th8.buildings + th8.traps + th8.walls);
  });
});

describe("Blueprint Naming & Validation Rules", () => {
  it("normalizes layout names by trimming and collapsing multiple spaces", () => {
    expect(normalizeLayoutName("   TH11   –    Chiến   tranh  ")).toBe("TH11 – Chiến tranh");
    expect(normalizeLayoutName("")).toBe("");
    expect(normalizeLayoutName("   ")).toBe("");
  });

  it("checks layout name equality case-insensitively and locale-aware", () => {
    expect(areLayoutNamesEqual("TH11 – Chiến tranh", "th11 – chiến tranh")).toBe(true);
    expect(areLayoutNamesEqual("  TH15 – Giữ tài nguyên 01  ", "th15 – giữ tài nguyên 01")).toBe(true);
    expect(areLayoutNamesEqual("TH11 – Chiến tranh", "TH12 – Chiến tranh")).toBe(false);
  });

  it("treats empty name as non-duplicate so it does not trigger 'Tên đã tồn tại' message", () => {
    const existing: LayoutProject[] = [
      {
        id: "id-1",
        name: "TH11 – Chiến tranh – Tự động 01",
        townHallLevel: 11,
        purpose: "war",
        creationMethod: "auto",
        buildings: [],
        catalogVersion: CURRENT_CATALOG_VERSION,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ];

    expect(isLayoutNameDuplicate("", existing)).toBe(false);
    expect(isLayoutNameDuplicate("   ", existing)).toBe(false);
  });

  it("detects duplicate names accurately, supporting self-exclusion during rename", () => {
    const existing: LayoutProject[] = [
      {
        id: "id-1",
        name: "TH11 – Chiến tranh – Tự động 01",
        townHallLevel: 11,
        purpose: "war",
        creationMethod: "auto",
        buildings: [],
        catalogVersion: CURRENT_CATALOG_VERSION,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
      {
        id: "id-2",
        name: "TH15 – Giữ tài nguyên – Mẫu 01",
        townHallLevel: 15,
        purpose: "farming",
        creationMethod: "template",
        buildings: [],
        catalogVersion: CURRENT_CATALOG_VERSION,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ];

    // Same name
    expect(isLayoutNameDuplicate("TH11 – Chiến tranh – Tự động 01", existing)).toBe(true);
    expect(isLayoutNameDuplicate("  th11 – chiến tranh – tự động 01  ", existing)).toBe(true);

    // Self-rename allowed (excluding self id)
    expect(isLayoutNameDuplicate("TH11 – Chiến tranh – Tự động 01", existing, "id-1")).toBe(false);

    // Different name
    expect(isLayoutNameDuplicate("TH11 – Chiến tranh – Tự động 02", existing)).toBe(false);
  });

  it("generates unique compliant blueprint names with proper padded numbering (01, 02...)", () => {
    const existing: LayoutProject[] = [
      {
        id: "id-1",
        name: "TH15 – Giữ tài nguyên – Tự động 01",
        townHallLevel: 15,
        purpose: "farming",
        creationMethod: "auto",
        buildings: [],
        catalogVersion: CURRENT_CATALOG_VERSION,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ];

    const nextName = generateUniqueBlueprintName(15, "farming", "auto", existing);
    expect(nextName).toBe("TH15 – Giữ tài nguyên – Tự động 02");

    const warName = generateUniqueBlueprintName(12, "war", "template", existing);
    expect(warName).toBe("TH12 – Chiến tranh – Mẫu 01");
  });
});

describe("Preset Availability (Mục 7)", () => {
  it("only enables preset templates for TH9 and above", () => {
    expect(hasPresetForTownHall(1)).toBe(false);
    expect(hasPresetForTownHall(7)).toBe(false);
    expect(hasPresetForTownHall(8)).toBe(false);
    expect(hasPresetForTownHall(9)).toBe(true);
    expect(hasPresetForTownHall(11)).toBe(true);
    expect(hasPresetForTownHall(15)).toBe(true);
    expect(hasPresetForTownHall(18)).toBe(true);
  });
});

describe("Legacy Data Migration", () => {
  it("migrates legacy layouts without purpose or creationMethod idempotently", () => {
    const legacyData: any[] = [
      {
        id: "old-1",
        name: "TH11 – War Base",
        townHallLevel: 11,
        buildings: [],
        createdAt: "2025-01-01",
        updatedAt: "2025-01-01",
      },
      {
        id: "old-2",
        name: "Bản đồ trống",
        townHallLevel: 9,
        buildings: [],
      },
    ];

    const migrated = migrateSavedLayouts(legacyData);
    expect(migrated).toHaveLength(2);
    expect(migrated[0].purpose).toBe("war");
    expect(migrated[0].creationMethod).toBe("template");
    expect(migrated[0].id).toBe("old-1");

    expect(migrated[1].purpose).toBe("hybrid");
    expect(migrated[1].creationMethod).toBe("blank");

    // Idempotent test: migrating again produces identical output
    const secondPass = migrateSavedLayouts(migrated);
    expect(secondPass).toEqual(migrated);
  });
});

describe("Layout Storage & Lifecycle Operations", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates blank layout with 'draft' status", () => {
    const newProject = createNewLayout({
      townHallLevel: 11,
      purpose: "trophy",
      creationMethod: "blank",
      name: "TH11 – Đẩy cúp – Trống 01",
      buildings: [],
    });

    expect(newProject.id).toBeDefined();
    expect(newProject.townHallLevel).toBe(11);
    expect(newProject.purpose).toBe("trophy");
    expect(newProject.creationMethod).toBe("blank");
    expect(newProject.status).toBe("draft");

    const all = getSavedLayouts();
    expect(all.some((l) => l.id === newProject.id)).toBe(true);
  });

  it("renames a layout and prevents duplicate name collision", () => {
    const p1 = createNewLayout({
      townHallLevel: 11,
      purpose: "war",
      creationMethod: "blank",
      name: "War Base Alpha",
      buildings: [],
    });

    const p2 = createNewLayout({
      townHallLevel: 11,
      purpose: "war",
      creationMethod: "blank",
      name: "War Base Beta",
      buildings: [],
    });

    // Valid rename
    const res1 = renameLayout(p1.id, "War Base Gamma");
    expect(res1.success).toBe(true);

    // Duplicate rename attempt
    const res2 = renameLayout(p2.id, "War Base Gamma");
    expect(res2.success).toBe(false);
    expect(res2.error).toContain("đã tồn tại");
  });

  it("duplicates a layout with a unique non-colliding name", () => {
    const orig = createNewLayout({
      townHallLevel: 11,
      purpose: "farming",
      creationMethod: "blank",
      name: "My Farm",
      buildings: [],
    });

    const clone = duplicateLayout(orig.id);
    expect(clone).not.toBeNull();
    expect(clone?.id).not.toBe(orig.id);
    expect(clone?.name).toBe("My Farm — Bản sao");
    expect(clone?.townHallLevel).toBe(11);

    const clone2 = duplicateLayout(orig.id);
    expect(clone2?.name).toBe("My Farm — Bản sao 2");
  });

  it("duplicates a layout to a different Town Hall and sanitizes limits", () => {
    const orig = createNewLayout({
      townHallLevel: 15,
      purpose: "war",
      creationMethod: "blank",
      name: "Big Base",
      buildings: [
        { instanceId: "1", buildingId: "town-hall", x: 20, y: 20 },
        { instanceId: "2", buildingId: "monolith", x: 25, y: 25 }, // Monolith requires TH15+
      ],
    });

    // Duplicate to TH11 (where monolith is not available)
    const cloneTH11 = duplicateLayout(orig.id, 11);
    expect(cloneTH11).not.toBeNull();
    expect(cloneTH11?.townHallLevel).toBe(11);
    // Monolith should be removed
    expect(cloneTH11?.buildings.some((b) => b.buildingId === "monolith")).toBe(false);
    expect(cloneTH11?.buildings.some((b) => b.buildingId === "town-hall")).toBe(true);
  });

  it("deletes layout and resets active ID safely", () => {
    const p1 = createNewLayout({
      townHallLevel: 10,
      purpose: "war",
      creationMethod: "blank",
      name: "To Delete",
      buildings: [],
    });

    setActiveLayoutId(p1.id);
    expect(getActiveLayoutId()).toBe(p1.id);

    deleteLayout(p1.id);
    const all = getSavedLayouts();
    expect(all.some((l) => l.id === p1.id)).toBe(false);
  });
});
