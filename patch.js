const fs = require('fs');
const file = 'src/components/base-planner/CanvasGridBoard.tsx';
let code = fs.readFileSync(file, 'utf8');

// Add imports
code = code.replace(
  'import { BUILDINGS_BY_ID',
  'import { upgradeItems } from "../../upgradeData";\nimport { targetForTownHall } from "../../utils/upgradeLogic";\nimport { getBuildingImagePath, preloadImage, getCachedImage } from "./imageMapper";\nimport { BUILDINGS_BY_ID'
);

// Remove the old getCachedImage import if it exists inline
// No, the original file doesn't import getCachedImage directly, wait it does...
