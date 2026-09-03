import { describe, it, expect } from "vitest";
import { generateBase } from "./baseGenerator";
import { validateGeneratedBase } from "./generatorValidator";
import { getTownHallCatalog, getTownHallRequirements } from "../catalog";
import { GRID_SIZE } from "../constants";
import type { BasePurpose, AestheticPattern } from "./types";

describe("CoC Auto Base Generator", () => {
  describe("Town Hall 11 Comprehensive Verification (Key User Requirement)", () => {
    it("generates a complete, valid TH11 War Base with 100% required buildings, hero objects, traps, and walls", () => {
      const result = generateBase({
        townHallLevel: 11,
        purpose: "war",
        seed: 12345,
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.stats.isValid).toBe(true);
      expect(result.stats.isComplete).toBe(true);

      const reqs = getTownHallRequirements(11);
      expect(result.stats.requiredWalls).toBe(300);
      expect(result.stats.wallsCount).toBe(300);
      expect(result.stats.totalPlaced).toBe(reqs.total);

      // Verify specific new game elements post-TH17 update
      const counts: Record<string, number> = {};
      for (const b of result.buildings) {
        counts[b.buildingId] = (counts[b.buildingId] || 0) + 1;
      }

      expect(counts["town-hall"]).toBe(1);
      expect(counts["eagle-artillery"]).toBe(1);
      expect(counts["clan-castle"]).toBe(1);
      expect(counts["hero-hall"]).toBe(1);
      expect(counts["hero-banner"]).toBe(3);
      expect(counts["helper-hut"]).toBe(1);
      expect(counts["builder-hut"]).toBe(5);
      expect(counts["cannon"]).toBe(7);
      expect(counts["archer-tower"]).toBe(8);
      expect(counts["mortar"]).toBe(4);
      expect(counts["air-defense"]).toBe(4);
      expect(counts["wizard-tower"]).toBe(5);
      expect(counts["xbow"]).toBe(4);
      expect(counts["inferno-tower"]).toBe(2);
      expect(counts["hidden-tesla"]).toBe(4);
      expect(counts["air-sweeper"]).toBe(2);
      expect(counts["bomb-tower"]).toBe(2);
      expect(counts["gold-storage"]).toBe(4);
      expect(counts["elixir-storage"]).toBe(4);
      expect(counts["dark-elixir-storage"]).toBe(1);
      expect(counts["tornado-trap"]).toBe(1);
      expect(counts["wall"]).toBe(300);

      // Verify no obsolete hero altars exist
      expect(counts["barbarian-king"]).toBeUndefined();
      expect(counts["archer-queen"]).toBeUndefined();
      expect(counts["grand-warden"]).toBeUndefined();

      // Independent strict validation
      const validation = validateGeneratedBase(result.buildings, 11);
      expect(validation.isValid).toBe(true);
      expect(validation.isComplete).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it("verifies NO collisions or overlaps in TH11 layout", () => {
      const result = generateBase({
        townHallLevel: 11,
        purpose: "war",
        seed: 9999,
      });

      const grid = new Uint8Array(GRID_SIZE * GRID_SIZE);
      for (const b of result.buildings) {
        const w = b.buildingId === "town-hall" || b.buildingId === "eagle-artillery" || b.buildingId === "hero-hall" || b.buildingId === "army-camp" ? 4 : (b.buildingId === "wall" || b.buildingId === "bomb" || b.buildingId === "spring-trap" || b.buildingId === "air-bomb" || b.buildingId === "seeking-air-mine" || b.buildingId === "skeleton-trap" || b.buildingId === "tornado-trap") ? 1 : (b.buildingId === "hero-banner" || b.buildingId === "helper-hut" || b.buildingId === "builder-hut" || b.buildingId === "giant-bomb" || b.buildingId === "hidden-tesla" || b.buildingId === "air-sweeper") ? 2 : 3;
        const h = w;

        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.y).toBeGreaterThanOrEqual(0);
        expect(b.x + w).toBeLessThanOrEqual(GRID_SIZE);
        expect(b.y + h).toBeLessThanOrEqual(GRID_SIZE);

        for (let r = 0; r < h; r++) {
          for (let c = 0; c < w; c++) {
            const idx = (b.y + r) * GRID_SIZE + (b.x + c);
            expect(grid[idx]).toBe(0); // must be unoccupied
            grid[idx] = 1;
          }
        }
      }
    });

    it("evaluates multi-dimensional scoring accurately", () => {
      const result = generateBase({
        townHallLevel: 11,
        purpose: "war",
        seed: 42,
      });

      expect(result.score.completeness).toBe(true);
      expect(result.score.validity).toBe(true);
      expect(result.score.overallScore).toBeGreaterThanOrEqual(70);
      expect(["S", "A", "B"]).toContain(result.score.tier);
    });
  });

  describe("Deterministic Seed PRNG", () => {
    it("produces 100% identical building coordinates for the same seed", () => {
      const res1 = generateBase({ townHallLevel: 11, purpose: "war", seed: 88888 });
      const res2 = generateBase({ townHallLevel: 11, purpose: "war", seed: 88888 });

      expect(res1.buildings.length).toBe(res2.buildings.length);
      for (let i = 0; i < res1.buildings.length; i++) {
        expect(res1.buildings[i].buildingId).toBe(res2.buildings[i].buildingId);
        expect(res1.buildings[i].x).toBe(res2.buildings[i].x);
        expect(res1.buildings[i].y).toBe(res2.buildings[i].y);
      }
    });

    it("produces variations when given different seeds", () => {
      const res1 = generateBase({ townHallLevel: 11, purpose: "war", seed: 11111 });
      const res2 = generateBase({ townHallLevel: 11, purpose: "war", seed: 22222 });

      let diffCount = 0;
      for (let i = 0; i < Math.min(res1.buildings.length, res2.buildings.length); i++) {
        if (res1.buildings[i].x !== res2.buildings[i].x || res1.buildings[i].y !== res2.buildings[i].y) {
          diffCount++;
        }
      }
      expect(diffCount).toBeGreaterThan(0);
    });
  });

  describe("All Supported Base Purposes", () => {
    const purposes: BasePurpose[] = ["war", "trophy", "farming", "hybrid", "progress", "showcase"];

    for (const purpose of purposes) {
      it(`generates a complete valid base for purpose: ${purpose}`, () => {
        const result = generateBase({
          townHallLevel: 11,
          purpose,
          pattern: purpose === "showcase" ? "diamond" : undefined,
          seed: 54321,
        });

        expect(result.success).toBe(true);
        expect(result.stats.isComplete).toBe(true);
        expect(result.stats.isValid).toBe(true);
        expect(result.buildings.length).toBe(result.stats.requiredTotal);
      });
    }
  });

  describe("All Town Hall Levels (TH1 to TH18)", () => {
    for (let th = 1; th <= 18; th++) {
      it(`generates valid and complete layout for Town Hall ${th}`, () => {
        const result = generateBase({
          townHallLevel: th,
          purpose: "war",
          seed: 100 + th,
        });

        expect(result.success).toBe(true);
        expect(result.stats.isComplete).toBe(true);
        expect(result.stats.isValid).toBe(true);
        expect(result.stats.totalPlaced).toBe(result.stats.requiredTotal);
      });
    }
  });
});
