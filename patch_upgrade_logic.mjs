import fs from 'fs';
let content = fs.readFileSync('src/utils/upgradeLogic.ts', 'utf8');
content = `import type { Player } from "../types";
import { type UpgradeItem, upgradeSources } from "../upgradeData";

` + content;
content = content.replace(/function /g, 'export function ');
content = content.replace(/export export /g, 'export '); // in case of Playstyle exports
fs.writeFileSync('src/utils/upgradeLogic.ts', content);
