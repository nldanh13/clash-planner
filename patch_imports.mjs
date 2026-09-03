import fs from 'fs';
let content = fs.readFileSync('src/components/base-planner/TacticalToolbar.tsx', 'utf8');

content = content.replace(
  /Trash2, Undo2, Upload, Zap, Eye, EyeOff, LayoutTemplate, ScanSearch, Edit3, Save, ZoomIn, ZoomOut, Maximize/g,
  'Trash2, Undo2, Upload, Zap, Eye, EyeOff, LayoutTemplate, ScanSearch, Edit3, Save, ZoomIn, ZoomOut, Maximize, Flame'
);
fs.writeFileSync('src/components/base-planner/TacticalToolbar.tsx', content);

let contentTab = fs.readFileSync('src/components/base-planner/BasePlannerTab.tsx', 'utf8');
contentTab = contentTab.replace(
  /import \{ TacticalToolbar \} from "\.\/TacticalToolbar";/g,
  'import TacticalToolbar from "./TacticalToolbar";'
);
fs.writeFileSync('src/components/base-planner/BasePlannerTab.tsx', contentTab);
