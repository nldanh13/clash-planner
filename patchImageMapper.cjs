const fs = require('fs');
const file = 'src/components/base-planner/imageMapper.ts';
let code = fs.readFileSync(file, 'utf8');

const oldLogic = `  // We don't have all levels physically present yet, but if someone adds them, 
  // we can try returning the leveled path. For preloading, we'll just use the base path.
  // Actually, we'll return the base image for now.
  // If we wanted to support levels: return \`/buildings/\${buildingId}-\${level}.png\`;
  return \`/buildings/\${buildingId}.png\`;
}`;

const newLogic = `  if (level) {
    return \`/buildings/\${buildingId}-\${level}.png\`;
  }
  return \`/buildings/\${buildingId}.png\`;
}`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync(file, code);
console.log("Patched imageMapper successfully");
