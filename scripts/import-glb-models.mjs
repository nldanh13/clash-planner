#!/usr/bin/env node
// Xử lý model .glb Hyper3D thả vào raw-models/ (xem raw-models/README.txt)
// thành public/models/<id>.glb — chỗ app thật sự đọc. Chạy:
//
//   node scripts/import-glb-models.mjs
//   node scripts/import-glb-models.mjs --check-only   (chỉ báo cáo, không copy)
//
// Không cần Internet — chỉ đọc/ghi file local.

import { readdir, mkdir, copyFile, stat, open } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const RAW_DIR = path.join(ROOT, "raw-models");
const OUT_DIR = path.join(ROOT, "public", "models");
const CHECK_ONLY = process.argv.includes("--check-only");

// Cùng danh sách 53 id với public/buildings/README.txt / raw-models/README.txt.
const KNOWN_IDS = new Set([
  "town-hall", "cannon", "archer-tower", "mortar", "air-defense", "wizard-tower",
  "air-sweeper", "hidden-tesla", "bomb-tower", "xbow", "inferno-tower",
  "eagle-artillery", "scattershot", "builder-hut", "monolith", "spell-tower",
  "multi-archer-tower", "ricochet-cannon", "firespitter",
  "gold-mine", "elixir-collector", "dark-elixir-drill", "gold-storage",
  "elixir-storage", "dark-elixir-storage", "helper-hut",
  "clan-castle", "army-camp", "barracks", "dark-barracks", "laboratory",
  "spell-factory", "dark-spell-factory", "blacksmith", "workshop", "pet-house",
  "hero-hall", "hero-banner",
  "barbarian-king", "archer-queen", "minion-prince", "grand-warden",
  "royal-champion", "dragon-duke",
  "bomb", "spring-trap", "air-bomb", "giant-bomb", "seeking-air-mine",
  "skeleton-trap", "tornado-trap", "giga-bomb",
  "wall",
]);

// A valid .glb starts with the 4-byte magic "glTF" (0x46546C67) followed by
// a uint32 version. Checking this catches an accidental non-glb upload
// (e.g. someone dragged in the .obj/.fbx variant by mistake) before it gets
// treated as real app content.
async function isValidGlb(filePath) {
  const handle = await open(filePath, "r");
  try {
    const buf = Buffer.alloc(8);
    const { bytesRead } = await handle.read(buf, 0, 8, 0);
    if (bytesRead < 8) return false;
    return buf.toString("ascii", 0, 4) === "glTF";
  } finally {
    await handle.close();
  }
}

async function main() {
  let entries;
  try {
    entries = await readdir(RAW_DIR);
  } catch {
    console.log(`Không tìm thấy thư mục ${RAW_DIR} — chưa có gì để xử lý.`);
    return;
  }

  const glbFiles = entries.filter((f) => f.toLowerCase().endsWith(".glb"));
  if (glbFiles.length === 0) {
    console.log("raw-models/ chưa có file .glb nào. Xem raw-models/README.txt để biết cách thả file vào.");
    return;
  }

  if (!CHECK_ONLY) await mkdir(OUT_DIR, { recursive: true });

  const matched = [];
  const unmatchedName = [];
  const invalidFile = [];

  for (const file of glbFiles) {
    const id = file.slice(0, -4);
    const fullPath = path.join(RAW_DIR, file);
    const s = await stat(fullPath);
    if (s.size === 0) {
      invalidFile.push(file + " (file rỗng)");
      continue;
    }
    if (!(await isValidGlb(fullPath))) {
      invalidFile.push(file + " (không phải .glb hợp lệ — kiểm tra lại định dạng xuất từ Hyper3D)");
      continue;
    }
    if (!KNOWN_IDS.has(id)) {
      unmatchedName.push(file);
      continue;
    }
    if (!CHECK_ONLY) {
      await copyFile(fullPath, path.join(OUT_DIR, `${id}.glb`));
    }
    matched.push({ id, sizeKb: Math.round(s.size / 1024) });
  }

  console.log(`\n${CHECK_ONLY ? "[check-only] " : ""}Kết quả xử lý ${glbFiles.length} file trong raw-models/:\n`);

  if (matched.length > 0) {
    console.log(`✅ Khớp id, ${CHECK_ONLY ? "sẽ được copy" : "đã copy"} vào public/models/:`);
    for (const m of matched) console.log(`   - ${m.id}.glb (${m.sizeKb} KB)`);
  }
  if (unmatchedName.length > 0) {
    console.log(`\n⚠️  Tên file không khớp id nào trong danh sách (xem raw-models/README.txt):`);
    for (const f of unmatchedName) console.log(`   - ${f}`);
  }
  if (invalidFile.length > 0) {
    console.log(`\n❌ File lỗi, bỏ qua:`);
    for (const f of invalidFile) console.log(`   - ${f}`);
  }

  const missing = [...KNOWN_IDS].filter((id) => !matched.some((m) => m.id === id));
  console.log(`\nCòn thiếu ${missing.length}/${KNOWN_IDS.size} id chưa có model (vẫn dùng ảnh/vector cũ bình thường):`);
  console.log("   " + missing.join(", "));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
