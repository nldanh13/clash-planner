const fs = require('fs');

function fixCanvas(file) {
  let code = fs.readFileSync(file, 'utf8');
  // Remove duplicate import
  const lines = code.split('\\n');
  const filtered = lines.filter(l => !l.includes('import { getCachedImage } from "./imageMapper";'));
  code = filtered.join('\\n');
  
  // Fix layout.townHallLevel if layout doesn't exist
  code = code.replace(/computedLevel = targetForTownHall\\(upItem, layout.townHallLevel\\);/g, 'computedLevel = targetForTownHall(upItem, townHallLevel);');
  
  // Fix drawBoardRef in CanvasGridBoard
  // Wait, layout is defined as `layout` in CanvasGridBoard? Yes, `layout={currentProject}` is passed. So `layout` exists.
  
  fs.writeFileSync(file, code);
}

function fixIso(file) {
  let code = fs.readFileSync(file, 'utf8');
  // Remove duplicate import
  const lines = code.split('\\n');
  const filtered = lines.filter(l => !l.includes('import { getCachedImage } from "./imageMapper";'));
  code = filtered.join('\\n');
  
  // IsoGridBoard uses `project.townHallLevel` instead of `layout.townHallLevel`
  code = code.replace(/computedLevel = targetForTownHall\\(upItem, layout.townHallLevel\\);/g, 'computedLevel = targetForTownHall(upItem, project.townHallLevel);');
  
  // Fix drawBoardRef() expected 1 arguments (if it expects one? Wait, no, drawBoard takes no arguments)
  
  fs.writeFileSync(file, code);
}

fixCanvas('src/components/base-planner/CanvasGridBoard.tsx');
fixIso('src/components/base-planner/IsometricGridBoard.tsx');
console.log("Fixed files");
