import fs from 'fs';
let content = fs.readFileSync('src/components/base-planner/types.ts', 'utf8');

content = content.replace(/export type RangeDisplayMode = "all" \| "selected" \| "none";/, 
`export type PlannerMode = "design" | "analysis";
export type RangeDisplayMode = "all" | "selected" | "none";
export type ChainLightningMode = "all" | "selected" | "none";`);

content = content.replace(/showChainLightning: boolean;/, `showChainLightning: ChainLightningMode;`);

content = content.replace(/chainMaxDistance: number;/, `chainMaxDistance: number;
  plannerMode: PlannerMode;
  showBuildingNames: boolean;
  showBuildingLevels: boolean;`);

fs.writeFileSync('src/components/base-planner/types.ts', content);
