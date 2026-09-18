const fs = require('fs');
const path = require('path');

function updateFile(filePath, search, replace) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(new RegExp(search, 'g'), replace);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

updateFile('src/components/base-planner/ExportUtils.ts', 'Clash Path', 'Osmox COC');
updateFile('src/i18n/locales/vi.ts', 'Clash Path', 'Osmox COC');
