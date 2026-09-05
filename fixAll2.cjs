const fs = require('fs');
function ensureImport(file) {
  let code = fs.readFileSync(file, 'utf8');
  if (!code.includes('getCachedImage } from "./imageMapper"')) {
    code = code.replace(
      'import { BUILDINGS_BY_ID',
      'import { getBuildingImagePath, preloadImage, getCachedImage } from "./imageMapper";\\nimport { BUILDINGS_BY_ID'
    );
  }
  fs.writeFileSync(file, code);
}
ensureImport('src/components/base-planner/CanvasGridBoard.tsx');
ensureImport('src/components/base-planner/IsometricGridBoard.tsx');
