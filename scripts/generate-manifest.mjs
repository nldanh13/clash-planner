#!/usr/bin/env node
// Sinh "danh sách file chuẩn" (scripts/package-manifest.json) cho các thư
// mục mã nguồn/tài nguyên tĩnh mà bản đóng gói (zip) này quản lý đầy đủ.
//
// CHẠY LẠI FILE NÀY MỖI KHI ĐÓNG GÓI DỰ ÁN THÀNH ZIP MỚI, ngay trước khi
// nén — để manifest luôn khớp với đúng những file có trong zip đó.
//
// Vì sao cần: khi người nhận giải nén một zip mới ĐÈ LÊN thư mục dự án cũ,
// unzip chỉ ghi mới/ghi đè — không tự xóa file đã bị loại bỏ ở phiên bản
// mới (đổi tên file, xóa bớt file, dọn code chết...). File mồ côi đó sẽ
// nằm lại mãi trên máy người dùng. scripts/cleanup.mjs dùng manifest do
// script này sinh ra để tìm và xóa đúng những file mồ côi đó, không hơn
// không kém.
//
// CHỈ quét các thư mục/file MÃ NGUỒN do chính zip quản lý đầy đủ — xem
// MANAGED_DIRS/MANAGED_FILES bên dưới. KHÔNG quét (và cleanup.mjs cũng
// không bao giờ đụng vào): node_modules/, .git/, public/data/,
// coc-admin/data/ (đều là dữ liệu tự sinh/tự cào lại được), và ảnh bạn tự
// tải hoặc tự thêm tay vào public/buildings, heroes, troops, spells,
// equipment, pets (ngoài các file placeholder liệt kê sẵn) — những chỗ đó
// là nội dung của riêng bạn, không phải một phần cố định của gói.
//
// Chạy: node scripts/generate-manifest.mjs

import { writeFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, "scripts", "package-manifest.json");

// Giữ đồng bộ tuyệt đối với MANAGED_DIRS/MANAGED_FILES trong cleanup.mjs.
export const MANAGED_DIRS = ["src", "scripts", "public/town-halls"];
export const MANAGED_FILES = [
  "package.json", "package-lock.json", "vite.config.ts", "index.html", "README.md",
  "coc-admin/README.txt", "coc-admin/scrape.mjs", "coc-admin/index.html",
  "public/buildings/README.txt",
  "public/heroes/.gitkeep", "public/troops/.gitkeep", "public/spells/.gitkeep",
  "public/equipment/.gitkeep", "public/pets/.gitkeep"
];

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

async function run() {
  const files = new Set();

  for (const rel of MANAGED_FILES) {
    if (await exists(path.join(ROOT, rel))) files.add(rel);
    else console.warn(`(bỏ qua, không tồn tại) ${rel}`);
  }

  for (const dir of MANAGED_DIRS) {
    const abs = path.join(ROOT, dir);
    if (!(await exists(abs))) { console.warn(`(bỏ qua, không tồn tại) ${dir}/`); continue; }
    const collected = [];
    await walk(abs, ROOT, collected);
    for (const f of collected) files.add(f);
  }

  const list = [...files].sort();
  await writeFile(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), files: list }, null, 2) + "\n");
  console.log(`Đã ghi ${list.length} đường dẫn vào ${path.relative(ROOT, OUT)}`);
  console.log("Nhớ đóng gói file này CÙNG với zip mới — cleanup.mjs ở máy người nhận cần nó để biết file nào là mồ côi.");
}

// Chỉ tự chạy khi file này được gọi trực tiếp (node scripts/generate-manifest.mjs).
// cleanup.mjs import MANAGED_DIRS/MANAGED_FILES từ đây — phải tránh chạy
// lại run() (và ghi đè package-manifest.json) như một side-effect của việc import.
if (path.resolve(process.argv[1] || "") === path.resolve(fileURLToPath(import.meta.url))) run();
