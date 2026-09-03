/**
 * Unified Building Limits - Re-exported from TownHallBuildingCatalog
 * All limits and building entries are now strictly sourced from catalog.ts.
 */

import {
  TH_COUNTS_REGISTRY,
  getAllBuildingLimits,
  getBuildingLimit,
  getTownHallCatalog,
  getTownHallRequirements,
  type TownHallBuildingEntry,
} from "./catalog";

export const TH_BUILDING_LIMITS = TH_COUNTS_REGISTRY;
export {
  getAllBuildingLimits,
  getBuildingLimit,
  getTownHallCatalog,
  getTownHallRequirements,
  type TownHallBuildingEntry,
};
