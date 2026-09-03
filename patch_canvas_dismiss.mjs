import fs from 'fs';
let content = fs.readFileSync('src/components/base-planner/CanvasGridBoard.tsx', 'utf8');

content = content.replace(
  /const \[isChainAlertDismissed, setIsChainAlertDismissed\] = useState\(false\);/,
  'const [isChainAlertDismissed, setIsChainAlertDismissed] = useState(true);'
);

content = content.replace(
  /const \[isHeatmapHudExpanded, setIsHeatmapHudExpanded\] = useState\(true\);/,
  'const [isHeatmapHudExpanded, setIsHeatmapHudExpanded] = useState(false);'
);

fs.writeFileSync('src/components/base-planner/CanvasGridBoard.tsx', content);
