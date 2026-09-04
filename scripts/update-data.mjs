import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { validateImages, validateTownHalls, validateLevels, validateCatalog } from './validator.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const cocAdminData = path.resolve(root, 'coc-admin', 'data');
const publicData = path.resolve(root, 'public', 'data');

const args = process.argv.slice(2);
const validateOnly = args.includes('--validate-only');
const wantLevels = args.includes('--levels');

if (!validateOnly) {
  console.log("Running coc-admin/scrape.mjs...");
  const scrapeArgs = ['--incremental'];
  if (wantLevels) scrapeArgs.push('--levels');
  
  try {
    execSync(`node coc-admin/scrape.mjs ${scrapeArgs.join(' ')}`, { stdio: 'inherit', cwd: root });
  } catch (e) {
    console.error("❌ Scraping failed.");
    process.exit(1);
  }
} else {
  console.log("Skipping scrape (--validate-only). Validating existing data in coc-admin/data...");
}

const requiredFiles = {
  'images.json': validateImages,
  'catalog.json': validateCatalog,
  'townhalls.json': validateTownHalls,
};

const optionalFiles = {
  'levels.json': validateLevels,
};

let allValid = true;
const pendingWrites = [];

// Helper to check and validate a single file
function processFile(file, validator, isRequired) {
  const srcFile = path.resolve(cocAdminData, file);
  if (!fs.existsSync(srcFile)) {
    if (isRequired) {
      console.error(`❌ Required file ${file} is missing in coc-admin/data/.`);
      allValid = false;
    }
    return;
  }
  
  try {
    const raw = fs.readFileSync(srcFile, 'utf-8');
    const data = JSON.parse(raw);
    
    if (validator(data)) {
      console.log(`✅ ${file} is valid.`);
      pendingWrites.push({
        file,
        content: JSON.stringify(data, null, 2)
      });
    } else {
      console.error(`❌ ${file} validation failed. Format is incorrect.`);
      allValid = false;
    }
  } catch (e) {
    console.error(`❌ Error reading or parsing ${file}:`, e.message);
    allValid = false;
  }
}

// 1. Process Required Files
for (const [file, validator] of Object.entries(requiredFiles)) {
  processFile(file, validator, true);
}

// 2. Process Optional Files
for (const [file, validator] of Object.entries(optionalFiles)) {
  processFile(file, validator, false);
}

if (!allValid) {
  console.error("❌ Validation failed. public/data/ was not updated.");
  process.exit(1);
}

console.log("All files passed validation. Updating public/data/...");

// Generate data-manifest.json
const manifest = {
  source: "coc.guide",
  updatedAt: new Date().toISOString(),
  version: "1.0.0",
  files: pendingWrites.map(pw => pw.file)
};
pendingWrites.push({
  file: 'data-manifest.json',
  content: JSON.stringify(manifest, null, 2)
});

// 3. Atomically write to public/data using a temporary directory in the same filesystem
try {
  const localTmpBase = path.resolve(root, '.tmp');
  if (!fs.existsSync(localTmpBase)) {
    fs.mkdirSync(localTmpBase, { recursive: true });
  }
  const tmpDir = fs.mkdtempSync(path.join(localTmpBase, 'coc-data-'));
  
  // Start with a copy of existing public/data so we don't lose anything not touched by this update
  if (fs.existsSync(publicData)) {
    fs.cpSync(publicData, tmpDir, { recursive: true });
  }
  
  // Write updated files to tmpDir
  for (const { file, content } of pendingWrites) {
    fs.writeFileSync(path.join(tmpDir, file), content);
  }
  
  // Atomic swap
  const oldData = path.resolve(root, 'public', 'data_old_' + Date.now());
  if (fs.existsSync(publicData)) {
    fs.renameSync(publicData, oldData);
  }
  fs.renameSync(tmpDir, publicData);
  
  // Also copy to dist/data if it exists (for production Express server)
  const distData = path.resolve(root, 'dist', 'data');
  if (fs.existsSync(path.resolve(root, 'dist'))) {
    fs.cpSync(publicData, distData, { recursive: true, force: true });
  }
  
  // Cleanup old data and temp dirs
  if (fs.existsSync(oldData)) {
    fs.rmSync(oldData, { recursive: true, force: true });
  }
  if (fs.existsSync(localTmpBase)) {
    fs.rmSync(localTmpBase, { recursive: true, force: true });
  }
  
  console.log("✅ Data successfully updated in public/data/.");

  try {
    console.log("Đang đồng bộ kho hình ảnh offline (scripts/download-images.mjs)...");
    execSync('node scripts/download-images.mjs', { stdio: 'inherit', cwd: root });
  } catch (imgErr) {
    console.warn("⚠️ Đồng bộ kho ảnh offline có cảnh báo:", imgErr.message);
  }
} catch (e) {
  console.error("❌ Failed to write to public/data/:", e.message);
  process.exit(1);
}
