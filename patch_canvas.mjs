import fs from 'fs';
let content = fs.readFileSync('src/components/base-planner/CanvasGridBoard.tsx', 'utf8');

content = content.replace(/settings\.chainMaxDistance/g, '2');
fs.writeFileSync('src/components/base-planner/CanvasGridBoard.tsx', content);
