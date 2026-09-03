/**
 * Clash of Clans Town Hall Building Catalog & Limits
 * 
 * AUDIT INFORMATION:
 * - Date of Audit: 2026-09-02 (CoC Town Hall 17 / Hero Hall Era)
 * - Reference Sources:
 *   1. Supercell Official Patch Notes (Town Hall 17 Update):
 *      https://supercell.com/en/games/clashofclans/blog/game-updates/the-town-hall-17-update-is-here-2/
 *   2. Clash Ninja Guide to Max Levels & Counts:
 *      https://www.clash.ninja/guides/max-levels-for-each-th
 *   3. Clash of Clans Fandom Wiki - Town Hall Structures & Hero Hall:
 *      https://clashofclans.fandom.com/wiki/Town_Hall
 *      https://clashofclans.fandom.com/wiki/Hero_Hall
 *      https://clashofclans.fandom.com/wiki/Helper_Hut
 * 
 * KEY GAMEPLAY & STRUCTURAL UPDATES AUDITED:
 * - Hero Altars were REMOVED from the village layout by Supercell.
 * - All Heroes are managed inside the 4x4 "Hero Hall" (unlocked at TH4/TH7).
 * - Defending heroes patrol assigned 2x2 "Hero Banners" (up to 4 banners on layout).
 * - "Helper Hut" (2x2) houses the Apprentice Builder and assistants (unlocked TH9).
 * - "Builder's Hut" (2x2) allows up to 5 huts on Home Village (weaponized from TH14).
 * - Merged Defenses (TH16+): Multi-Archer Tower, Ricochet Cannon.
 * - TH17 Defenses & Traps: Firespitter (3x3), Giga Bomb (2x2).
 */

import type { BuildingCategory } from "./types";

export const CURRENT_CATALOG_VERSION = "2026.1.0";

export interface TownHallBuildingEntry {
  buildingId: string;
  count: number;
  width: number;
  height: number;
  category: BuildingCategory;
  unlockTownHall: number;
  requiredInLayout: boolean;
}

// Building dimensions & metadata registry
export interface BuildingMetadata {
  id: string;
  name: string;
  category: BuildingCategory;
  width: number;
  height: number;
  unlockTownHall: number;
  requiredInLayout: boolean;
}

export const BUILDING_METADATA_MAP: Record<string, BuildingMetadata> = {
  // Town Hall
  "town-hall": { id: "town-hall", name: "Town Hall", category: "defense", width: 4, height: 4, unlockTownHall: 1, requiredInLayout: true },

  // Defenses
  "cannon": { id: "cannon", name: "Cannon", category: "defense", width: 3, height: 3, unlockTownHall: 1, requiredInLayout: true },
  "archer-tower": { id: "archer-tower", name: "Archer Tower", category: "defense", width: 3, height: 3, unlockTownHall: 2, requiredInLayout: true },
  "mortar": { id: "mortar", name: "Mortar", category: "defense", width: 3, height: 3, unlockTownHall: 3, requiredInLayout: true },
  "air-defense": { id: "air-defense", name: "Air Defense", category: "defense", width: 3, height: 3, unlockTownHall: 4, requiredInLayout: true },
  "wizard-tower": { id: "wizard-tower", name: "Wizard Tower", category: "defense", width: 3, height: 3, unlockTownHall: 5, requiredInLayout: true },
  "air-sweeper": { id: "air-sweeper", name: "Air Sweeper", category: "defense", width: 2, height: 2, unlockTownHall: 6, requiredInLayout: true },
  "hidden-tesla": { id: "hidden-tesla", name: "Hidden Tesla", category: "defense", width: 2, height: 2, unlockTownHall: 7, requiredInLayout: true },
  "bomb-tower": { id: "bomb-tower", name: "Bomb Tower", category: "defense", width: 3, height: 3, unlockTownHall: 8, requiredInLayout: true },
  "xbow": { id: "xbow", name: "X-Bow", category: "defense", width: 3, height: 3, unlockTownHall: 9, requiredInLayout: true },
  "inferno-tower": { id: "inferno-tower", name: "Inferno Tower", category: "defense", width: 3, height: 3, unlockTownHall: 10, requiredInLayout: true },
  "eagle-artillery": { id: "eagle-artillery", name: "Eagle Artillery", category: "defense", width: 4, height: 4, unlockTownHall: 11, requiredInLayout: true },
  "scattershot": { id: "scattershot", name: "Scattershot", category: "defense", width: 3, height: 3, unlockTownHall: 13, requiredInLayout: true },
  "monolith": { id: "monolith", name: "Monolith", category: "defense", width: 3, height: 3, unlockTownHall: 15, requiredInLayout: true },
  "spell-tower": { id: "spell-tower", name: "Spell Tower", category: "defense", width: 2, height: 2, unlockTownHall: 15, requiredInLayout: true },
  "multi-archer-tower": { id: "multi-archer-tower", name: "Multi-Archer Tower", category: "defense", width: 3, height: 3, unlockTownHall: 16, requiredInLayout: true },
  "ricochet-cannon": { id: "ricochet-cannon", name: "Ricochet Cannon", category: "defense", width: 3, height: 3, unlockTownHall: 16, requiredInLayout: true },
  "firespitter": { id: "firespitter", name: "Firespitter", category: "defense", width: 3, height: 3, unlockTownHall: 17, requiredInLayout: true },

  // Resources
  "gold-mine": { id: "gold-mine", name: "Gold Mine", category: "resource", width: 3, height: 3, unlockTownHall: 1, requiredInLayout: true },
  "elixir-collector": { id: "elixir-collector", name: "Elixir Collector", category: "resource", width: 3, height: 3, unlockTownHall: 1, requiredInLayout: true },
  "dark-elixir-drill": { id: "dark-elixir-drill", name: "Dark Elixir Drill", category: "resource", width: 3, height: 3, unlockTownHall: 7, requiredInLayout: true },
  "gold-storage": { id: "gold-storage", name: "Gold Storage", category: "resource", width: 3, height: 3, unlockTownHall: 1, requiredInLayout: true },
  "elixir-storage": { id: "elixir-storage", name: "Elixir Storage", category: "resource", width: 3, height: 3, unlockTownHall: 1, requiredInLayout: true },
  "dark-elixir-storage": { id: "dark-elixir-storage", name: "Dark Elixir Storage", category: "resource", width: 3, height: 3, unlockTownHall: 7, requiredInLayout: true },

  // Army
  "clan-castle": { id: "clan-castle", name: "Clan Castle", category: "army", width: 3, height: 3, unlockTownHall: 2, requiredInLayout: true },
  "army-camp": { id: "army-camp", name: "Army Camp", category: "army", width: 4, height: 4, unlockTownHall: 1, requiredInLayout: true },
  "barracks": { id: "barracks", name: "Barracks", category: "army", width: 3, height: 3, unlockTownHall: 1, requiredInLayout: true },
  "dark-barracks": { id: "dark-barracks", name: "Dark Barracks", category: "army", width: 3, height: 3, unlockTownHall: 7, requiredInLayout: true },
  "laboratory": { id: "laboratory", name: "Laboratory", category: "army", width: 3, height: 3, unlockTownHall: 3, requiredInLayout: true },
  "spell-factory": { id: "spell-factory", name: "Spell Factory", category: "army", width: 3, height: 3, unlockTownHall: 5, requiredInLayout: true },
  "dark-spell-factory": { id: "dark-spell-factory", name: "Dark Spell Factory", category: "army", width: 3, height: 3, unlockTownHall: 8, requiredInLayout: true },
  "blacksmith": { id: "blacksmith", name: "Blacksmith", category: "army", width: 3, height: 3, unlockTownHall: 8, requiredInLayout: true },
  "workshop": { id: "workshop", name: "Workshop", category: "army", width: 3, height: 3, unlockTownHall: 12, requiredInLayout: true },
  "pet-house": { id: "pet-house", name: "Pet House", category: "army", width: 3, height: 3, unlockTownHall: 14, requiredInLayout: true },

  // Heroes & Village Helpers (Post-TH17 update)
  "hero-hall": { id: "hero-hall", name: "Hero Hall", category: "army", width: 4, height: 4, unlockTownHall: 4, requiredInLayout: true },
  "hero-banner": { id: "hero-banner", name: "Hero Banner", category: "hero", width: 2, height: 2, unlockTownHall: 7, requiredInLayout: true },
  "helper-hut": { id: "helper-hut", name: "Helper Hut", category: "resource", width: 2, height: 2, unlockTownHall: 9, requiredInLayout: true },
  "builder-hut": { id: "builder-hut", name: "Builder's Hut", category: "resource", width: 2, height: 2, unlockTownHall: 1, requiredInLayout: true },

  // Traps
  "bomb": { id: "bomb", name: "Bomb", category: "trap", width: 1, height: 1, unlockTownHall: 3, requiredInLayout: true },
  "spring-trap": { id: "spring-trap", name: "Spring Trap", category: "trap", width: 1, height: 1, unlockTownHall: 4, requiredInLayout: true },
  "air-bomb": { id: "air-bomb", name: "Air Bomb", category: "trap", width: 1, height: 1, unlockTownHall: 5, requiredInLayout: true },
  "giant-bomb": { id: "giant-bomb", name: "Giant Bomb", category: "trap", width: 2, height: 2, unlockTownHall: 6, requiredInLayout: true },
  "seeking-air-mine": { id: "seeking-air-mine", name: "Seeking Air Mine", category: "trap", width: 1, height: 1, unlockTownHall: 7, requiredInLayout: true },
  "skeleton-trap": { id: "skeleton-trap", name: "Skeleton Trap", category: "trap", width: 1, height: 1, unlockTownHall: 8, requiredInLayout: true },
  "tornado-trap": { id: "tornado-trap", name: "Tornado Trap", category: "trap", width: 1, height: 1, unlockTownHall: 11, requiredInLayout: true },
  "giga-bomb": { id: "giga-bomb", name: "Giga Bomb", category: "trap", width: 2, height: 2, unlockTownHall: 17, requiredInLayout: true },

  // Walls
  "wall": { id: "wall", name: "Wall", category: "wall", width: 1, height: 1, unlockTownHall: 2, requiredInLayout: true },
};

/**
 * Raw counts of building instances available per Town Hall (TH1 -> TH18)
 * Standardized across Supercell Clash of Clans December 2024 / Town Hall 17 update.
 */
export const TH_COUNTS_REGISTRY: Record<number, Record<string, number>> = {
  1: {
    "town-hall": 1,
    "cannon": 1,
    "gold-mine": 1,
    "elixir-collector": 1,
    "gold-storage": 1,
    "elixir-storage": 1,
    "army-camp": 1,
    "barracks": 1,
    "builder-hut": 2,
    "wall": 0,
  },
  2: {
    "town-hall": 1,
    "cannon": 2,
    "archer-tower": 1,
    "gold-mine": 2,
    "elixir-collector": 2,
    "gold-storage": 1,
    "elixir-storage": 1,
    "army-camp": 1,
    "barracks": 1,
    "clan-castle": 1,
    "builder-hut": 2,
    "wall": 25,
  },
  3: {
    "town-hall": 1,
    "cannon": 2,
    "archer-tower": 1,
    "mortar": 1,
    "gold-mine": 3,
    "elixir-collector": 3,
    "gold-storage": 2,
    "elixir-storage": 2,
    "army-camp": 2,
    "barracks": 1,
    "laboratory": 1,
    "clan-castle": 1,
    "bomb": 2,
    "builder-hut": 2,
    "wall": 50,
  },
  4: {
    "town-hall": 1,
    "cannon": 2,
    "archer-tower": 2,
    "mortar": 1,
    "air-defense": 1,
    "gold-mine": 4,
    "elixir-collector": 4,
    "gold-storage": 2,
    "elixir-storage": 2,
    "army-camp": 2,
    "barracks": 1,
    "laboratory": 1,
    "clan-castle": 1,
    "hero-hall": 1,
    "builder-hut": 3,
    "bomb": 2,
    "spring-trap": 2,
    "wall": 75,
  },
  5: {
    "town-hall": 1,
    "cannon": 3,
    "archer-tower": 3,
    "mortar": 1,
    "air-defense": 1,
    "wizard-tower": 1,
    "gold-mine": 5,
    "elixir-collector": 5,
    "gold-storage": 2,
    "elixir-storage": 2,
    "army-camp": 3,
    "barracks": 1,
    "laboratory": 1,
    "spell-factory": 1,
    "clan-castle": 1,
    "hero-hall": 1,
    "builder-hut": 3,
    "bomb": 4,
    "spring-trap": 2,
    "air-bomb": 2,
    "wall": 100,
  },
  6: {
    "town-hall": 1,
    "cannon": 3,
    "archer-tower": 3,
    "mortar": 2,
    "air-defense": 2,
    "wizard-tower": 2,
    "air-sweeper": 1,
    "gold-mine": 6,
    "elixir-collector": 6,
    "gold-storage": 2,
    "elixir-storage": 2,
    "army-camp": 3,
    "barracks": 1,
    "laboratory": 1,
    "spell-factory": 1,
    "clan-castle": 1,
    "hero-hall": 1,
    "builder-hut": 4,
    "bomb": 4,
    "spring-trap": 2,
    "air-bomb": 2,
    "giant-bomb": 1,
    "wall": 125,
  },
  7: {
    "town-hall": 1,
    "cannon": 5,
    "archer-tower": 4,
    "mortar": 3,
    "air-defense": 3,
    "wizard-tower": 2,
    "air-sweeper": 1,
    "hidden-tesla": 2,
    "gold-mine": 6,
    "elixir-collector": 6,
    "dark-elixir-drill": 1,
    "gold-storage": 2,
    "elixir-storage": 2,
    "dark-elixir-storage": 1,
    "army-camp": 4,
    "barracks": 1,
    "dark-barracks": 1,
    "laboratory": 1,
    "spell-factory": 1,
    "clan-castle": 1,
    "hero-hall": 1,
    "hero-banner": 1, // Barbarian King
    "builder-hut": 5,
    "bomb": 6,
    "spring-trap": 4,
    "air-bomb": 3,
    "giant-bomb": 2,
    "seeking-air-mine": 1,
    "wall": 175,
  },
  8: {
    "town-hall": 1,
    "cannon": 5,
    "archer-tower": 5,
    "mortar": 4,
    "air-defense": 3,
    "wizard-tower": 3,
    "air-sweeper": 1,
    "hidden-tesla": 3,
    "bomb-tower": 1,
    "gold-mine": 6,
    "elixir-collector": 6,
    "dark-elixir-drill": 2,
    "gold-storage": 3,
    "elixir-storage": 3,
    "dark-elixir-storage": 1,
    "army-camp": 4,
    "barracks": 1,
    "dark-barracks": 1,
    "laboratory": 1,
    "spell-factory": 1,
    "dark-spell-factory": 1,
    "blacksmith": 1,
    "clan-castle": 1,
    "hero-hall": 1,
    "hero-banner": 1,
    "builder-hut": 5,
    "bomb": 6,
    "spring-trap": 6,
    "air-bomb": 4,
    "giant-bomb": 4,
    "seeking-air-mine": 3,
    "skeleton-trap": 2,
    "wall": 225,
  },
  9: {
    "town-hall": 1,
    "cannon": 5,
    "archer-tower": 6,
    "mortar": 4,
    "air-defense": 4,
    "wizard-tower": 4,
    "air-sweeper": 2,
    "hidden-tesla": 4,
    "bomb-tower": 1,
    "xbow": 2,
    "gold-mine": 7,
    "elixir-collector": 7,
    "dark-elixir-drill": 3,
    "gold-storage": 4,
    "elixir-storage": 4,
    "dark-elixir-storage": 1,
    "army-camp": 4,
    "barracks": 1,
    "dark-barracks": 1,
    "laboratory": 1,
    "spell-factory": 1,
    "dark-spell-factory": 1,
    "blacksmith": 1,
    "clan-castle": 1,
    "hero-hall": 1,
    "hero-banner": 2, // King + Queen
    "helper-hut": 1,
    "builder-hut": 5,
    "bomb": 6,
    "spring-trap": 6,
    "air-bomb": 4,
    "giant-bomb": 4,
    "seeking-air-mine": 4,
    "skeleton-trap": 2,
    "wall": 250,
  },
  10: {
    "town-hall": 1,
    "cannon": 6,
    "archer-tower": 7,
    "mortar": 4,
    "air-defense": 4,
    "wizard-tower": 4,
    "air-sweeper": 2,
    "hidden-tesla": 4,
    "bomb-tower": 2,
    "xbow": 3,
    "inferno-tower": 2,
    "gold-mine": 7,
    "elixir-collector": 7,
    "dark-elixir-drill": 3,
    "gold-storage": 4,
    "elixir-storage": 4,
    "dark-elixir-storage": 1,
    "army-camp": 4,
    "barracks": 1,
    "dark-barracks": 1,
    "laboratory": 1,
    "spell-factory": 1,
    "dark-spell-factory": 1,
    "blacksmith": 1,
    "clan-castle": 1,
    "hero-hall": 1,
    "hero-banner": 2,
    "helper-hut": 1,
    "builder-hut": 5,
    "bomb": 6,
    "spring-trap": 6,
    "air-bomb": 5,
    "giant-bomb": 5,
    "seeking-air-mine": 5,
    "skeleton-trap": 3,
    "wall": 275,
  },
  11: {
    "town-hall": 1,
    "cannon": 7,
    "archer-tower": 8,
    "mortar": 4,
    "air-defense": 4,
    "wizard-tower": 5,
    "air-sweeper": 2,
    "hidden-tesla": 4,
    "bomb-tower": 2,
    "xbow": 4,
    "inferno-tower": 2,
    "eagle-artillery": 1,
    "gold-mine": 7,
    "elixir-collector": 7,
    "dark-elixir-drill": 3,
    "gold-storage": 4,
    "elixir-storage": 4,
    "dark-elixir-storage": 1,
    "army-camp": 4,
    "barracks": 1,
    "dark-barracks": 1,
    "laboratory": 1,
    "spell-factory": 1,
    "dark-spell-factory": 1,
    "blacksmith": 1,
    "clan-castle": 1,
    "hero-hall": 1,
    "hero-banner": 3, // King + Queen + Warden
    "helper-hut": 1,
    "builder-hut": 5,
    "bomb": 6,
    "spring-trap": 6,
    "air-bomb": 5,
    "giant-bomb": 5,
    "seeking-air-mine": 5,
    "skeleton-trap": 3,
    "tornado-trap": 1,
    "wall": 300,
  },
  12: {
    "town-hall": 1,
    "cannon": 7,
    "archer-tower": 8,
    "mortar": 4,
    "air-defense": 4,
    "wizard-tower": 5,
    "air-sweeper": 2,
    "hidden-tesla": 5,
    "bomb-tower": 2,
    "xbow": 4,
    "inferno-tower": 3,
    "eagle-artillery": 1,
    "gold-mine": 7,
    "elixir-collector": 7,
    "dark-elixir-drill": 3,
    "gold-storage": 4,
    "elixir-storage": 4,
    "dark-elixir-storage": 1,
    "army-camp": 4,
    "barracks": 1,
    "dark-barracks": 1,
    "laboratory": 1,
    "spell-factory": 1,
    "dark-spell-factory": 1,
    "blacksmith": 1,
    "workshop": 1,
    "clan-castle": 1,
    "hero-hall": 1,
    "hero-banner": 3,
    "helper-hut": 1,
    "builder-hut": 5,
    "bomb": 6,
    "spring-trap": 8,
    "air-bomb": 6,
    "giant-bomb": 6,
    "seeking-air-mine": 6,
    "skeleton-trap": 3,
    "tornado-trap": 1,
    "wall": 300,
  },
  13: {
    "town-hall": 1,
    "cannon": 7,
    "archer-tower": 8,
    "mortar": 4,
    "air-defense": 4,
    "wizard-tower": 5,
    "air-sweeper": 2,
    "hidden-tesla": 5,
    "bomb-tower": 2,
    "xbow": 4,
    "inferno-tower": 3,
    "eagle-artillery": 1,
    "scattershot": 2,
    "gold-mine": 7,
    "elixir-collector": 7,
    "dark-elixir-drill": 3,
    "gold-storage": 4,
    "elixir-storage": 4,
    "dark-elixir-storage": 1,
    "army-camp": 4,
    "barracks": 1,
    "dark-barracks": 1,
    "laboratory": 1,
    "spell-factory": 1,
    "dark-spell-factory": 1,
    "blacksmith": 1,
    "workshop": 1,
    "clan-castle": 1,
    "hero-hall": 1,
    "hero-banner": 4, // Max 4 defending hero banners
    "helper-hut": 1,
    "builder-hut": 5,
    "bomb": 7,
    "spring-trap": 9,
    "air-bomb": 7,
    "giant-bomb": 7,
    "seeking-air-mine": 7,
    "skeleton-trap": 3,
    "tornado-trap": 1,
    "wall": 300,
  },
  14: {
    "town-hall": 1,
    "cannon": 7,
    "archer-tower": 8,
    "mortar": 4,
    "air-defense": 4,
    "wizard-tower": 5,
    "air-sweeper": 2,
    "hidden-tesla": 5,
    "bomb-tower": 2,
    "xbow": 4,
    "inferno-tower": 3,
    "eagle-artillery": 1,
    "scattershot": 2,
    "gold-mine": 7,
    "elixir-collector": 7,
    "dark-elixir-drill": 3,
    "gold-storage": 4,
    "elixir-storage": 4,
    "dark-elixir-storage": 1,
    "army-camp": 4,
    "barracks": 1,
    "dark-barracks": 1,
    "laboratory": 1,
    "spell-factory": 1,
    "dark-spell-factory": 1,
    "blacksmith": 1,
    "workshop": 1,
    "pet-house": 1,
    "clan-castle": 1,
    "hero-hall": 1,
    "hero-banner": 4,
    "helper-hut": 1,
    "builder-hut": 5, // Weaponized
    "bomb": 8,
    "spring-trap": 9,
    "air-bomb": 8,
    "giant-bomb": 7,
    "seeking-air-mine": 8,
    "skeleton-trap": 4,
    "tornado-trap": 1,
    "wall": 325,
  },
  15: {
    "town-hall": 1,
    "cannon": 7,
    "archer-tower": 8,
    "mortar": 4,
    "air-defense": 4,
    "wizard-tower": 5,
    "air-sweeper": 2,
    "hidden-tesla": 5,
    "bomb-tower": 2,
    "xbow": 4,
    "inferno-tower": 3,
    "eagle-artillery": 1,
    "scattershot": 2,
    "monolith": 1,
    "spell-tower": 2,
    "gold-mine": 7,
    "elixir-collector": 7,
    "dark-elixir-drill": 3,
    "gold-storage": 4,
    "elixir-storage": 4,
    "dark-elixir-storage": 1,
    "army-camp": 4,
    "barracks": 1,
    "dark-barracks": 1,
    "laboratory": 1,
    "spell-factory": 1,
    "dark-spell-factory": 1,
    "blacksmith": 1,
    "workshop": 1,
    "pet-house": 1,
    "clan-castle": 1,
    "hero-hall": 1,
    "hero-banner": 4,
    "helper-hut": 1,
    "builder-hut": 5,
    "bomb": 9,
    "spring-trap": 9,
    "air-bomb": 9,
    "giant-bomb": 8,
    "seeking-air-mine": 9,
    "skeleton-trap": 4,
    "tornado-trap": 1,
    "wall": 325,
  },
  16: {
    "town-hall": 1,
    "cannon": 3, // 4 cannons merged into 2 ricochet-cannons (7 - 4 = 3 regular)
    "archer-tower": 4, // 4 archer towers merged into 2 multi-archer-towers (8 - 4 = 4 regular)
    "multi-archer-tower": 2,
    "ricochet-cannon": 2,
    "mortar": 4,
    "air-defense": 4,
    "wizard-tower": 5,
    "air-sweeper": 2,
    "hidden-tesla": 5,
    "bomb-tower": 2,
    "xbow": 4,
    "inferno-tower": 3,
    "eagle-artillery": 1,
    "scattershot": 2,
    "monolith": 1,
    "spell-tower": 2,
    "gold-mine": 7,
    "elixir-collector": 7,
    "dark-elixir-drill": 3,
    "gold-storage": 4,
    "elixir-storage": 4,
    "dark-elixir-storage": 1,
    "army-camp": 4,
    "barracks": 1,
    "dark-barracks": 1,
    "laboratory": 1,
    "spell-factory": 1,
    "dark-spell-factory": 1,
    "blacksmith": 1,
    "workshop": 1,
    "pet-house": 1,
    "clan-castle": 1,
    "hero-hall": 1,
    "hero-banner": 4,
    "helper-hut": 1,
    "builder-hut": 5,
    "bomb": 9,
    "spring-trap": 9,
    "air-bomb": 9,
    "giant-bomb": 8,
    "seeking-air-mine": 9,
    "skeleton-trap": 4,
    "tornado-trap": 1,
    "wall": 325,
  },
  17: {
    "town-hall": 1,
    "cannon": 5,
    "archer-tower": 6,
    "multi-archer-tower": 2,
    "ricochet-cannon": 2,
    "firespitter": 2,
    "mortar": 4,
    "air-defense": 4,
    "wizard-tower": 5,
    "air-sweeper": 2,
    "hidden-tesla": 5,
    "bomb-tower": 2,
    "xbow": 4,
    "inferno-tower": 3,
    "eagle-artillery": 1,
    "scattershot": 2,
    "monolith": 1,
    "spell-tower": 2,
    "gold-mine": 7,
    "elixir-collector": 7,
    "dark-elixir-drill": 3,
    "gold-storage": 4,
    "elixir-storage": 4,
    "dark-elixir-storage": 1,
    "army-camp": 4,
    "barracks": 1,
    "dark-barracks": 1,
    "laboratory": 1,
    "spell-factory": 1,
    "dark-spell-factory": 1,
    "blacksmith": 1,
    "workshop": 1,
    "pet-house": 1,
    "clan-castle": 1,
    "hero-hall": 1,
    "hero-banner": 4,
    "helper-hut": 1,
    "builder-hut": 5,
    "bomb": 10,
    "spring-trap": 9,
    "air-bomb": 10,
    "giant-bomb": 8,
    "seeking-air-mine": 10,
    "skeleton-trap": 4,
    "tornado-trap": 1,
    "giga-bomb": 1,
    "wall": 325,
  },
  18: {
    "town-hall": 1,
    "cannon": 5,
    "archer-tower": 6,
    "multi-archer-tower": 2,
    "ricochet-cannon": 2,
    "firespitter": 2,
    "mortar": 4,
    "air-defense": 4,
    "wizard-tower": 5,
    "air-sweeper": 2,
    "hidden-tesla": 5,
    "bomb-tower": 2,
    "xbow": 4,
    "inferno-tower": 3,
    "eagle-artillery": 1,
    "scattershot": 2,
    "monolith": 1,
    "spell-tower": 2,
    "gold-mine": 7,
    "elixir-collector": 7,
    "dark-elixir-drill": 3,
    "gold-storage": 4,
    "elixir-storage": 4,
    "dark-elixir-storage": 1,
    "army-camp": 4,
    "barracks": 1,
    "dark-barracks": 1,
    "laboratory": 1,
    "spell-factory": 1,
    "dark-spell-factory": 1,
    "blacksmith": 1,
    "workshop": 1,
    "pet-house": 1,
    "clan-castle": 1,
    "hero-hall": 1,
    "hero-banner": 4,
    "helper-hut": 1,
    "builder-hut": 5,
    "bomb": 10,
    "spring-trap": 9,
    "air-bomb": 10,
    "giant-bomb": 8,
    "seeking-air-mine": 10,
    "skeleton-trap": 4,
    "tornado-trap": 1,
    "giga-bomb": 1,
    "wall": 325,
  },
};

/**
 * Standardized TownHallBuildingCatalog Generator
 * Produces structured TownHallBuildingEntry items for the requested Town Hall.
 */
export function getTownHallCatalog(townHallLevel: number): TownHallBuildingEntry[] {
  const safeTh = Math.max(1, Math.min(18, Math.trunc(townHallLevel) || 1));
  const counts = TH_COUNTS_REGISTRY[safeTh] || TH_COUNTS_REGISTRY[1];
  const result: TownHallBuildingEntry[] = [];

  for (const [buildingId, count] of Object.entries(counts)) {
    if (count <= 0) continue;
    const meta = BUILDING_METADATA_MAP[buildingId];
    if (!meta) continue;

    result.push({
      buildingId,
      count,
      width: meta.width,
      height: meta.height,
      category: meta.category,
      unlockTownHall: meta.unlockTownHall,
      requiredInLayout: meta.requiredInLayout,
    });
  }

  return result;
}

/**
 * Returns map of buildingId -> limit count for a given Town Hall level.
 */
export function getAllBuildingLimits(townHallLevel: number): Record<string, number> {
  const safeTh = Math.max(1, Math.min(18, Math.trunc(townHallLevel) || 1));
  return TH_COUNTS_REGISTRY[safeTh] || TH_COUNTS_REGISTRY[1];
}

/**
 * Returns count limit of a single buildingId at a given Town Hall level.
 */
export function getBuildingLimit(townHallLevel: number, buildingId: string): number {
  const limits = getAllBuildingLimits(townHallLevel);
  return limits[buildingId] || 0;
}

/**
 * Returns summary requirements for Town Hall:
 * - buildings: all non-trap, non-wall structures
 * - traps: all traps
 * - walls: wall count
 * - total: sum of everything
 */
export function getTownHallRequirements(townHallLevel: number): {
  buildings: number;
  traps: number;
  walls: number;
  total: number;
} {
  const entries = getTownHallCatalog(townHallLevel);
  let buildings = 0;
  let traps = 0;
  let walls = 0;

  for (const item of entries) {
    if (item.category === "wall") {
      walls += item.count;
    } else if (item.category === "trap") {
      traps += item.count;
    } else {
      buildings += item.count;
    }
  }

  return {
    buildings,
    traps,
    walls,
    total: buildings + traps + walls,
  };
}
