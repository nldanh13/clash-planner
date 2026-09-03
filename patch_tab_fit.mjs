import fs from 'fs';
let content = fs.readFileSync('src/components/base-planner/BasePlannerTab.tsx', 'utf8');

content = content.replace(
  /const container = document.querySelector\('\.planner-canvas-scroll'\);/,
  "const container = document.querySelector('.grid-canvas-viewport');"
);

fs.writeFileSync('src/components/base-planner/BasePlannerTab.tsx', content);
