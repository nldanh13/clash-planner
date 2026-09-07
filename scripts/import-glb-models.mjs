#!/usr/bin/env node
// Xử lý model .glb Hyper3D thả vào raw-models/ (xem raw-models/README.txt)
// thành public/models/<id>.glb — chỗ app thật sự đọc. Chạy:
//
//   node scripts/import-glb-models.mjs
//   node scripts/import-glb-models.mjs --check-only         (chỉ báo cáo, không copy/nén)
//   node scripts/import-glb-models.mjs --no-optimize         (copy nguyên bản, bỏ qua nén)
//   node scripts/import-glb-models.mjs --source=data-model-3d (đọc từ thư mục khác, không phải raw-models/)
//
// --source nhận đường dẫn tương đối (tính từ gốc repo) hoặc tuyệt đối —
// dùng khi bạn muốn giữ file .glb gốc ở một thư mục local riêng (ví dụ
// data-model-3d/, đã có sẵn trong .gitignore) thay vì raw-models/, để
// chạy thẳng trên máy mà không cần đưa file lên GitHub hay gửi qua chat.
//
// Quét ĐỆ QUY vào mọi thư mục con của --source (hoặc raw-models/) — có
// thể để nguyên cấu trúc thư mục con tùy ý (ví dụ townhall/, army/...),
// không cần gom hết .glb ra một chỗ phẳng. Cũng tự nhận diện file .zip
// tải thẳng từ Hyper3D (chưa giải nén) — tự mở, tìm file .glb bên trong
// (ưu tiên bản "pbr", rớt xuống "shaded" nếu không có), dùng TÊN FILE ZIP
// (không phải tên file .glb bên trong, luôn là "base_basic_pbr.glb" giống
// nhau ở mọi zip) để xác định đúng id/cấp độ — nên chỉ cần đặt tên file
// .zip đúng chuẩn (vd. town-hall-5.zip) là đủ, không cần tự giải nén rồi
// đổi tên tay.
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

import { readdir, mkdir, copyFile, stat, open, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import AdmZip from "adm-zip";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourceArg = process.argv.find((a) => a.startsWith("--source="));
const RAW_DIR = sourceArg
  ? path.resolve(ROOT, sourceArg.slice("--source=".length))
  : path.join(ROOT, "raw-models");
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

/** Recursively lists every file under dir, however deeply nested. */
async function walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Turns every discovered .glb / .zip under RAW_DIR into a uniform
 * candidate: { logicalName, actualPath, cleanup }. A .glb file's logical
 * name is its own filename; a .zip's logical name is the ZIP's filename
 * (e.g. "town-hall-5.zip" -> "town-hall-5.glb") since Hyper3D always
 * names the .glb inside the same generic way ("base_basic_pbr.glb")
 * regardless of which building it is — cleanup deletes the extracted
 * temp copy once this run is done with it.
 */
async function collectCandidates(allFiles) {
  const candidates = [];
  const tmpRoot = path.join(tmpdir(), "clash-planner-glb-import-" + Date.now());

  for (const filePath of allFiles) {
    const lower = filePath.toLowerCase();
    if (lower.endsWith(".glb")) {
      candidates.push({ logicalName: path.basename(filePath), actualPath: filePath, cleanup: null });
      continue;
    }
    if (lower.endsWith(".zip")) {
      let zip;
      try {
        zip = new AdmZip(filePath);
      } catch {
        continue; // not a real zip, or unreadable — silently skip, not this script's job to validate arbitrary zips
      }
      const glbEntries = zip.getEntries().filter((e) => !e.isDirectory && e.entryName.toLowerCase().endsWith(".glb"));
      if (glbEntries.length === 0) continue; // e.g. one of the reference-image zips, no model inside
      const pick =
        glbEntries.find((e) => e.entryName.toLowerCase().includes("pbr")) ||
        glbEntries.find((e) => e.entryName.toLowerCase().includes("shaded")) ||
        glbEntries[0];
      const zipStem = path.basename(filePath, path.extname(filePath));
      const outTmp = path.join(tmpRoot, zipStem + ".glb");
      await mkdir(tmpRoot, { recursive: true });
      await writeFile(outTmp, zip.readFile(pick));
      candidates.push({
        logicalName: zipStem + ".glb",
        actualPath: outTmp,
        cleanup: () => rm(outTmp, { force: true }),
        sourceZip: path.basename(filePath),
      });
    }
  }
  return { candidates, tmpRoot };
}

async function main() {
  const allFiles = await walk(RAW_DIR);
  if (allFiles.length === 0) {
    console.log(`Không tìm thấy thư mục ${RAW_DIR}, hoặc thư mục rỗng.`);
    return;
  }

  const { candidates, tmpRoot } = await collectCandidates(allFiles);
  if (candidates.length === 0) {
    console.log(
      `${RAW_DIR} chưa có file .glb hay .zip chứa .glb nào. Xem raw-models/README.txt để biết cách đặt tên file.`
    );
    return;
  }

  if (!CHECK_ONLY) await mkdir(OUT_DIR, { recursive: true });

  const matched = [];
  const unmatchedName = [];
  const invalidFile = [];
  const optimizeFailed = [];

  for (const candidate of candidates) {
    // Accept "<id>.glb" and "<id>-<level>.glb" (e.g. "air-defense-18.glb"
    // or "wall-post-13.glb") — same per-level naming public/buildings/
    // already uses for art that changes look across upgrade levels, see
    // getLeveledBuildingImage. <id> is either one of the 53 real
    // building ids or one of the two wall-part base names. A .zip's
    // logical name (its own filename) is parsed exactly the same way.
    const stem = candidate.logicalName.slice(0, -4);
    const levelMatch = stem.match(/^(.+)-(\d+)$/);
    const id = levelMatch ? levelMatch[1] : stem;
    const isWallPart = WALL_PART_IDS.has(id);
    const label = candidate.sourceZip ? `${candidate.sourceZip} (bên trong: ${candidate.logicalName})` : candidate.logicalName;

    const s = await stat(candidate.actualPath);
    if (s.size === 0) {
      invalidFile.push(label + " (file rỗng)");
      if (candidate.cleanup) await candidate.cleanup();
      continue;
    }
    if (!(await isValidGlb(candidate.actualPath))) {
      invalidFile.push(label + " (không phải .glb hợp lệ — kiểm tra lại định dạng xuất từ Hyper3D)");
      if (candidate.cleanup) await candidate.cleanup();
      continue;
    }
    if (!isWallPart && !KNOWN_IDS.has(id)) {
      unmatchedName.push(label);
      if (candidate.cleanup) await candidate.cleanup();
      continue;
    }

    const outPath = path.join(OUT_DIR, stem + ".glb");
    let finalSize = s.size;
    let optimized = false;
    if (!CHECK_ONLY) {
      if (NO_OPTIMIZE) {
        await copyFile(candidate.actualPath, outPath);
      } else {
        try {
          optimizeGlb(candidate.actualPath, outPath);
          optimized = true;
          finalSize = (await stat(outPath)).size;
        } catch (err) {
          optimizeFailed.push(`${label}: ${err.message.split("\n")[0]}`);
          await copyFile(candidate.actualPath, outPath);
        }
      }
    }
    if (candidate.cleanup) await candidate.cleanup();
    matched.push({
      id,
      outputName: stem + ".glb",
      sizeKb: Math.round(finalSize / 1024),
      originalKb: Math.round(s.size / 1024),
      optimized,
      fromZip: Boolean(candidate.sourceZip),
    });
  }

  await rm(tmpRoot, { recursive: true, force: true });

  console.log(`\n${CHECK_ONLY ? "[check-only] " : ""}Kết quả xử lý ${candidates.length} model tìm thấy trong ${RAW_DIR} (đệ quy):\n`);

  if (matched.length > 0) {
    console.log(`✅ Khớp id, ${CHECK_ONLY ? "sẽ được copy" : "đã copy"} vào public/models/:`);
    for (const m of matched) {
      const sizeNote = m.optimized
        ? `${m.originalKb} KB -> ${m.sizeKb} KB sau khi nén texture 512px/WebP`
        : `${m.sizeKb} KB`;
      console.log(`   - ${m.outputName} (id: ${m.id}, ${sizeNote}${m.fromZip ? ", từ .zip" : ""})`);
    }
  }
  if (unmatchedName.length > 0) {
    console.log(`\n⚠️  Tên không khớp id nào trong danh sách (xem raw-models/README.txt):`);
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
