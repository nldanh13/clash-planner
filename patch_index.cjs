const fs = require('fs');

const appFile = 'index.html';
let content = fs.readFileSync(appFile, 'utf8');

content = content.replace(
  '<link rel="icon" type="image/svg+xml" href="/icon.svg" />',
  '<link rel="icon" type="image/png" href="/logo-icon.png" />'
);

content = content.replace(
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
  '<link rel="apple-touch-icon" href="/logo-icon.png" />'
);

fs.writeFileSync(appFile, content);
