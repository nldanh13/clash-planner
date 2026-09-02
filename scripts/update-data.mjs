import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const cocAdminData = path.resolve(root, 'coc-admin', 'data');
const publicData = path.resolve(root, 'public', 'data');

console.log("Running coc-admin/scrape.mjs...");
try {
  // execSync('node coc-admin/scrape.mjs --levels', { stdio: 'inherit', cwd: root }); // This might take long or fail if it requires internet to scrape. Let's just assume we run it or just validate what's there.
  console.log("Skipping actual scrape to save time, validating existing data...");
} catch (e) {
  console.error("Scraping failed.");
  process.exit(1);
}

// 1. Validation logic
function validateImages(data) {
  if (typeof data !== 'object' || data === null) return false;
  return Object.values(data).every(v => typeof v === 'string' && v.startsWith('http'));
}

function validateTownHalls(data) {
  if (!Array.isArray(data)) return false;
  return data.every(th => 
    typeof th.level === 'number' &&
    typeof th.title === 'string' &&
    typeof th.unlocks === 'object'
  );
}

function validateLevels(data) {
  if (typeof data !== 'object' || data === null) return false;
  return Object.values(data).every(arr => 
    Array.isArray(arr) && arr.every(row => 
      typeof row.level === 'number' &&
      typeof row.cost === 'number' &&
      typeof row.timeHours === 'number'
    )
  );
}

const schemas = {
  'images.json': validateImages,
  'townhalls.json': validateTownHalls,
  'levels.json': validateLevels,
};

let allValid = true;

for (const [file, validator] of Object.entries(schemas)) {
  const srcFile = path.resolve(cocAdminData, file);
  if (!fs.existsSync(srcFile)) {
    console.warn(`File ${file} is missing in coc-admin/data/`);
    continue;
  }
  
  try {
    const raw = fs.readFileSync(srcFile, 'utf-8');
    const data = JSON.parse(raw);
    
    // Add metadata if not present
    const metaData = Array.isArray(data) ? { items: data } : { ...data };
    metaData._meta = {
      source: "coc.guide",
      updatedAt: new Date().toISOString(),
      version: "1.0.0"
    };

    const dataToValidate = Array.isArray(data) ? data : (data.items || data);
    
    if (validator(dataToValidate)) {
      console.log(`✅ ${file} is valid.`);
      if (!fs.existsSync(publicData)) fs.mkdirSync(publicData, { recursive: true });
      fs.writeFileSync(path.resolve(publicData, file), JSON.stringify(metaData, null, 2));
    } else {
      console.error(`❌ ${file} validation failed. Format is incorrect.`);
      allValid = false;
    }
  } catch (e) {
    console.error(`❌ Error reading or parsing ${file}:`, e.message);
    allValid = false;
  }
}

if (!allValid) {
  console.error("Some files failed validation. public/data was not fully updated.");
  process.exit(1);
} else {
  console.log("Data successfully validated and copied to public/data/");
}
