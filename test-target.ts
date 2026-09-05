import { upgradeItems } from "./src/upgradeData";
import { targetForTownHall, summarizePlan } from "./src/utils/upgradeLogic";
const cannon = upgradeItems.find(i => i.id === "cannon");
const target = targetForTownHall(cannon, 9);
console.log("targetForTownHall for Cannon TH9:", target);
console.log("Plan from level 1 to target:", summarizePlan(cannon, 1, target).steps.map(s => s.level));
