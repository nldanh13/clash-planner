import fs from 'fs';
let content = fs.readFileSync('src/utils/upgradeLogic.ts', 'utf8');

content = content.replace(/return \{ steps, costs, totalHours: steps.reduce\(\(sum, step\) => sum \+ step.timeHours \* quantity, 0\) \};/, 
`return {
    steps,
    costs,
    totalHours: steps.reduce((sum, step) => sum + step.timeHours * quantity, 0),
    requiredTownHall: steps.length ? Math.max(...steps.map(x => x.townHall)) : 0,
    requires: steps.length ? Array.from(new Set(steps.flatMap(x => x.requires || []))) : []
  };`);
fs.writeFileSync('src/utils/upgradeLogic.ts', content);
