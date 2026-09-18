const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'index.html',
  'metadata.json',
  'package.json',
  'README.md'
];

function updateFile(filePath, search, replace) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(new RegExp(search, 'g'), replace);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

filesToUpdate.forEach(file => {
  updateFile(file, 'Clash Path', 'Osmox COC');
  if (file === 'package.json') {
    updateFile(file, 'clash-planner', 'osmox-coc');
  }
});
