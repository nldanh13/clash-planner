#!/usr/bin/env node
// Dọn các file "mồ côi": còn sót lại trên máy nhưng KHÔNG còn thuộc bản
// đóng gói (zip) hiện tại — vì giải nén một zip mới đè lên thư mục dự án
// cũ chỉ ghi mới/ghi đè, KHÔNG tự xóa file mà phiên bản mới đã bỏ đi (đổi
// tên file, xóa component, dọn code chết...).
//
// CHẠY SAU KHI giải nén bản zip mới đè lên thư mục dự án cũ:
//   node scripts/cleanup.mjs            # chỉ liệt kê, KHÔNG xóa gì (an toàn, mặc định)
//   node scripts/cleanup.mjs --apply    # xóa thật các file/thư mục đã liệt kê
//
// Script làm 2 việc:
//   1) Luôn coi thư mục dist/ là rác và xóa toàn bộ — Vite đặt tên file
//      theo hash nội dung nên mỗi lần build ra tên khác nhau, bản build cũ
//      không bao giờ còn cần thiết sau khi có bản build mới. Chạy
//      `npm run build` để tạo lại khi cần.
//   2) Đối chiếu các thư mục/file MÃ NGUỒN do gói quản lý đầy đủ (khớp với
//      scripts/generate-manifest.mjs) với scripts/package-manifest.json đi
//      kèm zip — file nào đang có trên máy nhưng không có trong manifest
//      tức là đã bị bỏ khỏi bản đóng gói hiện tại, sẽ được báo/xóa.
//
// KHÔNG BAO GIỜ đụng tới: node_modules/, .git/, public/data/,
// coc-admin/data/ (dữ liệu tự sinh/tự cào lại được), và ảnh bạn tự tải
// hoặc tự thêm tay vào public/buildings, heroes, troops, spells,
// equipment, pets (ngoài các file placeholder liệt kê sẵn) — những chỗ đó
// là nội dung của riêng bạn, script sẽ không bao giờ quét tới.

import { readFile, readdir, stat, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MANAGED_DIRS, MANAGED_FILES } from "./generate-manifest.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const MANIFEST_PATH = path.join(ROOT, "scripts", "package-manifest.json");
const APPLY = process.argv.includes("--apply");
const ALWAYS_WIPE = ["dist"];

async function exists(p) { try { await stat(p); return true; } catch { return false; } }

async function walk(dir, base, out) {
  for (const name of await readdir(dir)) {
    const full = path.join(dir, name);
    const rel = path.relative(base, full).split(path.sep).join("/");
    const s = await stat(full);
    if (s.isDirectory()) await walk(full, base, out);
    else out.push(rel);
  }
}

// Xóa thư mục con rỗng còn sót lại sau khi xóa file mồ côi, chỉ trong phạm
// vi các thư mục do gói quản lý (an toàn — không đi lạc sang chỗ khác).
async function pruneEmptyDirs(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const full = path.join(dir, e.name);
    await pruneEmptyDirs(full);
    const inner = await readdir(full).catch(() => null);
    if (inner && inner.length === 0) await rm(full, { recursive: true, force: true });
  }
}

async function run() {
  console.log(APPLY ? "Chế độ: XÓA THẬT (--apply)\n" : "Chế độ: chỉ liệt kê (dry-run) — thêm --apply để xóa thật\n");

  for (const dir of ALWAYS_WIPE) {
    const abs = path.join(ROOT, dir);
    if (await exists(abs)) {
      console.log(`${APPLY ? "Đã xóa" : "Sẽ xóa"} toàn bộ: ${dir}/  (bản build cũ — chạy npm run build để tạo lại)`);
      if (APPLY) await rm(abs, { recursive: true, force: true });
    }
  }

  if (!(await exists(MANIFEST_PATH))) {
    console.log("\nKhông tìm thấy scripts/package-manifest.json trong bản zip này (có thể do đóng gói từ trước khi có script này) — bỏ qua bước tìm file mồ côi trong src/, scripts/, public/town-halls/, coc-admin/.");
    return;
  }
  const manifest = new Set(JSON.parse(await readFile(MANIFEST_PATH, "utf8")).files);

  const actual = [];
  for (const rel of MANAGED_FILES) if (await exists(path.join(ROOT, rel))) actual.push(rel);
  for (const dir of MANAGED_DIRS) {
    const abs = path.join(ROOT, dir);
    if (!(await exists(abs))) continue;
    const collected = [];
    await walk(abs, ROOT, collected);
    actual.push(...collected);
  }

  const orphans = actual.filter((rel) => !manifest.has(rel)).sort();
  if (!orphans.length) {
    console.log("\nKhông có file mồ côi nào trong src/, scripts/, public/town-halls/, coc-admin/ (trừ data/) hay các file gốc của dự án.");
  } else {
    console.log(`\nTìm thấy ${orphans.length} file không còn thuộc bản đóng gói hiện tại:`);
    for (const rel of orphans) console.log(`  ${APPLY ? "✘ đã xóa" : "- sẽ xóa"}: ${rel}`);
    if (APPLY) {
      for (const rel of orphans) await rm(path.join(ROOT, rel), { force: true });
      for (const dir of MANAGED_DIRS) {
        const abs = path.join(ROOT, dir);
        if (await exists(abs)) await pruneEmptyDirs(abs);
      }
    } else {
      console.log("\nChạy lại với `node scripts/cleanup.mjs --apply` để xóa thật các file trên.");
    }
  }

  console.log("\nLưu ý: script này KHÔNG đụng tới node_modules/, .git/, public/data/, coc-admin/data/, hay ảnh bạn tự tải/tự thêm vào public/buildings, heroes, troops, spells, equipment, pets.");
}

run();
