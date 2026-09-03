import fs from 'fs';
let code = fs.readFileSync('src/components/app/UpgradeTracker.tsx', 'utf8');
code = code.replace(/<\/section>[\s\S]*$/, '</section>\n  );\n}\n');
fs.writeFileSync('src/components/app/UpgradeTracker.tsx', code);
