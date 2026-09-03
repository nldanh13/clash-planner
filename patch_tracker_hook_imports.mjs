import fs from 'fs';
let content = fs.readFileSync('src/hooks/useUpgradeTracker.ts', 'utf8');

content = content.replace(/import { type UpgradeItem, type UpgradeLane, emptyCosts, addCosts, upgradeItems } from "..\/upgradeData";/, 
`import { type UpgradeItem, type UpgradeLane, upgradeItems } from "../upgradeData";\nimport { emptyCosts, addCosts } from "../utils/formatters";`);

fs.writeFileSync('src/hooks/useUpgradeTracker.ts', content);
