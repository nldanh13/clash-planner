#!/usr/bin/env node
// Xử lý model .glb Hyper3D thả vào raw-models/ (xem raw-models/README.txt)
// thành public/models/<id>.glb — chỗ app thật sự đọc. Chạy:
//
//   node scripts/import-glb-models.mjs
//   node scripts/import-glb-models.mjs --check-only   (chỉ báo cáo, không copy/nén)
//   node scripts/import-glb-models.mjs --no-optimize  (copy nguyên bản, bỏ qua nén)
//
// Không cần Internet — chỉ đọc/ghi file local.
//
// Vì sao có bước nén: đo thực tế trên model Town Hall cấp 1 đầu tiên cho
// thấy phần hình học chỉ ~300KB, nhưng riêng 3 texture (màu/normal/độ nhám)
// xuất ở 2048x2048 từ Hyper3D chiếm tới ~22MB bộ nhớ GPU MỖI texture — tức
// ~67MB VRAM cho một công trình nhỏ hiển thị dạng icon. Với hàng chục công
// trình cùng lúc trên một base, mức đó không thể chấp nhận được. Giảm về
// 512x512 + chuyển sang WebP giữ nguyên chất lượng nhìn thấy được ở kích
// thước hiển thị thực tế nhưng giảm dung lượng file lẫn VRAM khoảng 15-19
// lần — không cần đụng đến phần hình học (đã đủ nhỏ) hay thêm bộ giải nén
// runtime nào (Draco/KTX2) vào app.

import { readdir, mkdir, copyFile, stat, open, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const RAW_DIR = path.join(ROOT, "raw-models");
const OUT_DIR = path.join(ROOT, "public", "models");
const CHECK_ONLY = process.argv.includes("--check-only");
const NO_OPTIMIZE = process.argv.includes("--no-optimize");
const GLTF_TRANSFORM = path.join(ROOT, "node_modules", ".bin", "gltf-transform");
const TEXTURE_SIZE = 512;

/**
 * Resizes every texture to TEXTURE_SIZE and re-encodes as WebP in place.
 * Runs gltf-transform as a subprocess (simplest way to reuse its resize +
 * webp commands without wiring their JS API by hand) against a scratch
 * copy so a failure never corrupts anything already in raw-models/.
 */
function optimizeGlb(inputPath, outputPath) {
  execFileSync(GLTF_TRANSFORM, ["resize", "--width", String(TEXTURE_SIZE), "--height", String(TEXTURE_SIZE), inputPath, outputPath], {
    stdio: "pipe",
  });
  execFileSync(GLTF_TRANSFORM, ["webp", outputPath, outputPath], { stdio: "pipe" });
}

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

// The wall's two named parts (agreed with the user: "trụ" / post and
// "cánh nối" / connecting arm — see the matching comment on drawWallArt
// in buildingRenderer.ts) aren't separate catalog buildings, just two
// pieces meant to be composited per-tile the same way the 2D vector
// fallback already does (a post at every wall tile's center, an arm
// reaching toward each connected neighbor). Recognized as their own
// fixed base names — "wall-post" / "wall-arm" — rather than one of the
// 53 real building ids, but still go through the same optional
// "-<level>" suffix as everything else below (wall changes material
// across all 19 levels, e.g. wall-post-13.glb), and are reported
// separately from the 53-id missing count.
const WALL_PART_IDS = new Set(["wall-post", "wall-arm"]);

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
  const optimizeFailed = [];

  for (const file of glbFiles) {
    // Accept "<id>.glb" and "<id>-<level>.glb" (e.g. "air-defense-18.glb"
    // or "wall-post-13.glb") — same per-level naming public/buildings/
    // already uses for art that changes look across upgrade levels, see
    // getLeveledBuildingImage. <id> is either one of the 53 real
    // building ids or one of the two wall-part base names.
    const stem = file.slice(0, -4);
    const levelMatch = stem.match(/^(.+)-(\d+)$/);
    const id = levelMatch ? levelMatch[1] : stem;
    const isWallPart = WALL_PART_IDS.has(id);
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
    if (!isWallPart && !KNOWN_IDS.has(id)) {
      unmatchedName.push(file);
      continue;
    }

    const outPath = path.join(OUT_DIR, stem + ".glb");
    let finalSize = s.size;
    let optimized = false;
    if (!CHECK_ONLY) {
      if (NO_OPTIMIZE) {
        await copyFile(fullPath, outPath);
      } else {
        try {
          optimizeGlb(fullPath, outPath);
          optimized = true;
          finalSize = (await stat(outPath)).size;
        } catch (err) {
          optimizeFailed.push(`${file}: ${err.message.split("\n")[0]}`);
          await copyFile(fullPath, outPath);
        }
      }
    }
    matched.push({
      id,
      outputName: stem + ".glb",
      sizeKb: Math.round(finalSize / 1024),
      originalKb: Math.round(s.size / 1024),
      optimized,
    });
  }

  console.log(`\n${CHECK_ONLY ? "[check-only] " : ""}Kết quả xử lý ${glbFiles.length} file trong raw-models/:\n`);

  if (matched.length > 0) {
    console.log(`✅ Khớp id, ${CHECK_ONLY ? "sẽ được copy" : "đã copy"} vào public/models/:`);
    for (const m of matched) {
      const sizeNote = m.optimized
        ? `${m.originalKb} KB -> ${m.sizeKb} KB sau khi nén texture 512px/WebP`
        : `${m.sizeKb} KB`;
      console.log(`   - ${m.outputName} (id: ${m.id}, ${sizeNote})`);
    }
  }
  if (unmatchedName.length > 0) {
    console.log(`\n⚠️  Tên file không khớp id nào trong danh sách (xem raw-models/README.txt):`);
    for (const f of unmatchedName) console.log(`   - ${f}`);
  }
  if (optimizeFailed.length > 0) {
    console.log(`\n⚠️  Nén thất bại, đã copy bản gốc (chưa tối ưu) thay thế:`);
    for (const f of optimizeFailed) console.log(`   - ${f}`);
  }
  if (invalidFile.length > 0) {
    console.log(`\n❌ File lỗi, bỏ qua:`);
    for (const f of invalidFile) console.log(`   - ${f}`);
  }

  const missing = [...KNOWN_IDS].filter((id) => !matched.some((m) => m.id === id));
  console.log(`\nCòn thiếu ${missing.length}/${KNOWN_IDS.size} id chưa có model (vẫn dùng ảnh/vector cũ bình thường):`);
  console.log("   " + missing.join(", "));

  console.log(`\nPhần tường ghép riêng (trụ / cánh nối) — chưa được app tự ghép hiển thị, chỉ mới nằm sẵn trong public/models/:`);
  for (const partId of WALL_PART_IDS) {
    const variants = matched.filter((m) => m.id === partId).map((m) => m.outputName);
    console.log(`   - ${partId}: ${variants.length > 0 ? variants.join(", ") : "chưa có"}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
