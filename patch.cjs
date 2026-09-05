const fs = require('fs');
const file = 'src/components/base-planner/CanvasGridBoard.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('import { upgradeItems }')) {
  code = code.replace(
    'import { BUILDINGS_BY_ID',
    'import { upgradeItems } from "../../upgradeData";\nimport { targetForTownHall } from "../../utils/upgradeLogic";\nimport { getBuildingImagePath, preloadImage, getCachedImage } from "./imageMapper";\nimport { BUILDINGS_BY_ID'
  );
}

// Replace the image mapping logic
const oldImgLogic = `      const imgKey = b.buildingId === "town-hall" ? \`town-hall-\${b.level || 1}\` : b.buildingId;
      const img = getCachedImage(imgKey) || getCachedImage(b.buildingId);`;

const newImgLogic = `      let computedLevel = b.level;
      if (!computedLevel && b.buildingId !== "town-hall") {
        const upItem = upgradeItems.find((i) => i.id === b.buildingId);
        if (upItem) computedLevel = targetForTownHall(upItem, townHallLevel);
      }
      const imgKey = b.buildingId === "town-hall" ? \`town-hall-\${b.level || 1}\` : (computedLevel ? \`\${b.buildingId}-\${computedLevel}\` : b.buildingId);
      let img = getCachedImage(imgKey);
      if (!img) {
        const src = getBuildingImagePath(b.buildingId, computedLevel);
        if (src) preloadImage(imgKey, src).then(() => drawBoardRef.current?.());
        img = getCachedImage(b.buildingId);
      }`;

code = code.replace(oldImgLogic, newImgLogic);

// Add drawBoardRef to be able to trigger redraw
if (!code.includes('const drawBoardRef = useRef')) {
  code = code.replace(
    'const activeDragRef = useRef<ActiveDrag | null>(null);',
    'const activeDragRef = useRef<ActiveDrag | null>(null);\n  const drawBoardRef = useRef<() => void>();'
  );
  code = code.replace(
    'const drawBoard = useCallback(() => {',
    'const drawBoard = useCallback(() => {\n    drawBoardRef.current = drawBoard;'
  );
}

fs.writeFileSync(file, code);
console.log("Patched CanvasGridBoard successfully");
