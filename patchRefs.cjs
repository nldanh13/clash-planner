const fs = require('fs');

function patchFile(file) {
  let code = fs.readFileSync(file, 'utf8');

  // Fix townHallLevel to layout.townHallLevel
  code = code.replace(/computedLevel = targetForTownHall\(upItem, townHallLevel\);/g, 'computedLevel = targetForTownHall(upItem, layout.townHallLevel);');

  // Add drawBoardRef
  if (!code.includes('const drawBoardRef = useRef')) {
    code = code.replace(
      'const canvasRef = useRef<HTMLCanvasElement>(null);',
      'const canvasRef = useRef<HTMLCanvasElement>(null);\n  const drawBoardRef = useRef<() => void>();'
    );
    code = code.replace(
      'const drawBoard = useCallback(() => {',
      'const drawBoard = useCallback(() => {\n    drawBoardRef.current = drawBoard;'
    );
  }
  
  // Remove duplicate import getCachedImage
  const lines = code.split('\\n');
  const filtered = lines.filter(l => !l.includes('import { getCachedImage, preloadAllBaseImages } from "./imageMapper";'));
  code = filtered.join('\\n');

  fs.writeFileSync(file, code);
}

patchFile('src/components/base-planner/CanvasGridBoard.tsx');
patchFile('src/components/base-planner/IsometricGridBoard.tsx');
console.log("Fixed refs");
