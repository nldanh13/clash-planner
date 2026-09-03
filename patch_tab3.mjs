import fs from 'fs';
let content = fs.readFileSync('src/components/base-planner/BasePlannerTab.tsx', 'utf8');

content = content.replace(
  /if \(\!settings\.showChainLightning\) return \{ dangerPairs: \[\] \};/,
  'if (settings.showChainLightning === "none") return { dangerPairs: [] };'
);

content = content.replace(
  /chainIssuesCount=\{chainIssuesCount\}/,
  'chainIssuesCount={chainAnalysis.dangerPairs.length}'
);

fs.writeFileSync('src/components/base-planner/BasePlannerTab.tsx', content);
