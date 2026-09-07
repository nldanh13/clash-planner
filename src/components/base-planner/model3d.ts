/**
 * Resolves which .glb URL to try for a building/level (see
 * scripts/import-glb-models.mjs and raw-models/README.txt for how these
 * land in public/models/). Mirrors imageMapper.ts's per-level-then-base
 * fallback for 2D sprites: a level-specific model wins when present,
 * otherwise fall back to one shared model for every level of that
 * building. Most buildings have neither yet — Building3DPreview tries
 * these in order and reports "unavailable" once both 404.
 */
export function getModelCandidateUrls(buildingId: string, level?: number): string[] {
  const urls: string[] = [];
  if (level && level > 0) urls.push(`/models/${buildingId}-${level}.glb`);
  urls.push(`/models/${buildingId}.glb`);
  return urls;
}
