import fs from 'fs';
let content = fs.readFileSync('src/components/app/UpgradeTracker.tsx', 'utf8');

const additionalImports = `
import { Hammer, FlaskConical, PawPrint, Wrench } from "lucide-react";
import { SmartArt } from "../SmartArt";
import { clampInteger } from "../../utils/villageImport";
import { type UpgradeLane } from "../../upgradeData";
import { fmtCost, playstyleHint } from "../../utils/formatters";
import { manualKey, trackerKindOrder } from "../../utils/upgradeLogic";
import { useMemo } from "react";
`;
content = content.replace(/import { pct, fmtNumber, fmtTime, fmtTimeExact, itemKindLabel, dataStatusLabel } from "..\/..\/utils\/formatters";/,
`import { pct, fmtNumber, fmtTime, fmtTimeExact, itemKindLabel, dataStatusLabel, fmtCost, playstyleHint } from "../../utils/formatters";`);

content = content.replace(/import { CostBadges } from "..\/SmartArt";/,
`import { CostBadges, SmartArt } from "../SmartArt";`);

content = content.replace(/import { AlertTriangle, Castle, Clock3, Coins, Crosshair, Gem, Info, Target } from "lucide-react";/,
`import { AlertTriangle, Castle, Clock3, Coins, Crosshair, Gem, Info, Target, Hammer, FlaskConical, PawPrint, Wrench } from "lucide-react";`);

content = content.replace(/import { type Playstyle, type StyleFocus, readStoredChoice, currentLevelFor, summarizePlan } from "..\/..\/utils\/upgradeLogic";/,
`import { type Playstyle, type StyleFocus, readStoredChoice, currentLevelFor, summarizePlan, manualKey, trackerKindOrder } from "../../utils/upgradeLogic";`);

content = content.replace(/import { useUpgradeTracker, plannerItems } from "..\/..\/hooks\/useUpgradeTracker";/,
`import { useUpgradeTracker, plannerItems } from "../../hooks/useUpgradeTracker";
import { clampInteger } from "../../utils/villageImport";
import { type UpgradeLane } from "../../upgradeData";
import { useMemo } from "react";
`);

content = content.replace(/interface UpgradeTrackerProps \{/,
`interface UpgradeTrackerProps {
  setGuestTownHall: (th: number) => void;
  setManualLevels: React.Dispatch<React.SetStateAction<Record<string, number>>>;`);

content = content.replace(/export function UpgradeTracker\(\{ player, manualLevels, guestTownHall \}: UpgradeTrackerProps\) \{/,
`export function UpgradeTracker({ player, manualLevels, guestTownHall, setGuestTownHall, setManualLevels }: UpgradeTrackerProps) {`);

content = content.replace(/const plan = summarizePlan\(plannerItem, currentPlannerLevel, safeTargetLevel, plannerItem.quantity\);/,
`const plan = summarizePlan(plannerItem, currentPlannerLevel, safeTargetLevel, plannerItem.quantity);
  const plannerItemGroups = useMemo(()=>trackerKindOrder.map(kind=>({ kind, items: plannerItems.filter(i=>i.kind===kind) })).filter(g=>g.items.length), []);
  const setManualLevel = (item: any, val: number) => setManualLevels(prev => ({ ...prev, [manualKey(player, item)]: val }));
`);

fs.writeFileSync('src/components/app/UpgradeTracker.tsx', content);
