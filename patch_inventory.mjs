import fs from 'fs';
let content = fs.readFileSync('src/components/base-planner/InventorySidebar.tsx', 'utf8');

content = content.replace(
  /className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none"/,
  'className="flex items-center flex-wrap gap-1 pb-1"'
);

fs.writeFileSync('src/components/base-planner/InventorySidebar.tsx', content);
