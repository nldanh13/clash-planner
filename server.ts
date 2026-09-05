import { config as loadEnvFile } from "dotenv";
import express from "express";
import path from "path";
import { timingSafeEqual } from "crypto";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import sharp from "sharp";
import { BUILDINGS_BY_ID } from "./src/components/base-planner/constants";
import { DECORATIONS_BY_ID } from "./src/components/base-planner/decorationCatalog";

// This is a plain Node/Express process — unlike the Vite dev server (which
// auto-loads .env* files for client code via import.meta.env), it never
// reads .env files on its own, only real OS environment variables. Load the
// same files Vite does, in the same precedence order (.env.local wins),
// so a key set in either actually reaches process.env here too. Both are
// gitignored — see .gitignore — never commit real secrets into them.
loadEnvFile({ path: ".env" });
loadEnvFile({ path: ".env.local", override: true });

// In-memory only — every upload is validated then resized/re-encoded by sharp
// before ever touching disk, so nothing user-supplied is written verbatim.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
});

/**
 * Resolves an admin image-upload request to the public/ relative path it
 * should be saved at, plus the max dimension to downscale it to. Returns
 * null for a request that doesn't map to a real catalog entry — ids come
 * from an admin-only, password-gated form, but are still validated against
 * the actual catalogs (not just a regex) before they ever reach the
 * filesystem, since they end up as part of a file path.
 */
function resolveUploadTarget(
  target: unknown,
  id: unknown,
  level: unknown
): { relPath: string; maxDim: number } | { error: string } {
  if (typeof id !== "string" || !/^[a-z0-9-]+$/.test(id)) {
    return { error: "ID không hợp lệ." };
  }

  if (target === "townhall") {
    const lvl = Number(level);
    if (!Number.isInteger(lvl) || lvl < 1 || lvl > 18) {
      return { error: "Cấp độ Town Hall phải là số nguyên từ 1 đến 18." };
    }
    return { relPath: `town-halls/th-${lvl}.png`, maxDim: 1100 };
  }

  if (target === "building") {
    if (!BUILDINGS_BY_ID.has(id)) {
      return { error: "Công trình không tồn tại trong danh mục." };
    }
    if (level === undefined || level === null || level === "") {
      return { relPath: `buildings/${id}.png`, maxDim: 720 };
    }
    const lvl = Number(level);
    if (!Number.isInteger(lvl) || lvl < 1 || lvl > 30) {
      return { error: "Cấp độ công trình không hợp lệ." };
    }
    return { relPath: `buildings/${id}-${lvl}.png`, maxDim: 720 };
  }

  if (target === "decoration") {
    if (!DECORATIONS_BY_ID.has(id)) {
      return { error: "Trang trí không tồn tại trong danh mục." };
    }
    return { relPath: `decorations/${id}.png`, maxDim: 600 };
  }

  return { error: "target không hợp lệ (phải là building, townhall hoặc decoration)." };
}

// Fail-closed admin auth: without ADMIN_PASSWORD set, the admin endpoints run
// shell commands (npm run update-data / download-images.mjs), so a missing
// password must reject every request rather than let them all through.
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return res.status(503).json({ error: "Máy chủ chưa cấu hình ADMIN_PASSWORD. Tính năng quản trị đang bị khoá vì lý do an toàn." });
  }

  const provided = req.headers["x-admin-password"];
  const providedStr = Array.isArray(provided) ? provided[0] : provided || "";
  const providedBuf = Buffer.from(providedStr, "utf8");
  const expectedBuf = Buffer.from(adminPassword, "utf8");
  const isValid = providedBuf.length === expectedBuf.length && timingSafeEqual(providedBuf, expectedBuf);

  if (!isValid) {
    return res.status(401).json({ error: "Mật khẩu quản trị không hợp lệ." });
  }
  next();
}

async function startServer() {
  const apiKey = process.env.COC_API_TOKEN || process.env.WAR_REPORT_API_KEY;
  if (!apiKey) {
    console.warn("CẢNH BÁO: Thiếu biến môi trường COC_API_TOKEN. Các yêu cầu API sẽ thất bại.");
  }

  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON
  app.use(express.json());

  // API Proxy Route for Clash of Clans (via RoyaleAPI Proxy)
  app.use("/api/warreport/v1", async (req, res) => {
    if (!apiKey) {
      return res.status(503).json({ error: "Chưa cấu hình COC_API_TOKEN. Vui lòng lấy API Key tại developer.clashofclans.com (với IP 45.79.218.79) và thêm vào môi trường." });
    }
    
    try {
      // Use RoyaleAPI public proxy to bypass IP whitelist restrictions
      const targetUrl = `https://cocproxy.royaleapi.dev/v1${req.url}`;

      const response = await fetch(targetUrl, {
        method: req.method,
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      });

      const contentType = response.headers.get("content-type") || "";
      const responseText = await response.text();

      if (contentType.includes("application/json")) {
        try {
          const jsonData = JSON.parse(responseText);
          // Clash of Clans API typically returns 403 or 400 with a reason/message
          return res.status(response.status).json(jsonData);
        } catch {
          return res.status(502).json({ error: "Dữ liệu trả về từ proxy không hợp lệ (lỗi cú pháp JSON)." });
        }
      }

      return res.status(response.status >= 400 ? response.status : 502).json({
        error: response.status === 403
          ? "API Key không hợp lệ hoặc đã bị vô hiệu hóa."
          : `Proxy phản hồi mã lỗi ${response.status} (không phải định dạng JSON).`
      });
    } catch (error: any) {
      console.error("Proxy Error:", error);
      res.status(502).json({ error: "Không thể kết nối đến máy chủ Proxy của Clash of Clans API." });
    }
  });

  // Admin API to run data scraping
  app.post("/api/admin/update-data", requireAdmin, async (req, res) => {
    try {
      const { exec } = await import("child_process");
      exec("npm run update-data", { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
        if (error) {
          console.error("Update data error:", error);
          return res.status(500).json({ error: "Lỗi khi cập nhật dữ liệu.", details: stderr || error.message });
        }
        console.log("Update data output:", stdout);
        res.json({ success: true, message: "Cập nhật dữ liệu thành công.", output: stdout });
      });
    } catch (error: any) {
      res.status(500).json({ error: "Không thể khởi chạy tiến trình cập nhật." });
    }
  });

  // Admin API to get local image asset repository status
  app.get("/api/admin/assets-status", async (req, res) => {
    try {
      const { readFile } = await import("node:fs/promises");
      const manifestPath = path.join(process.cwd(), "public", "assets-manifest.json");
      const content = await readFile(manifestPath, "utf-8");
      res.json(JSON.parse(content));
    } catch {
      // If manifest does not exist yet, trigger check-only rebuild
      try {
        const { exec } = await import("child_process");
        exec("node scripts/download-images.mjs --manifest-only", (err) => {
          if (err) return res.status(500).json({ error: "Chưa thể tạo bảng kê kho hình ảnh." });
          import("node:fs/promises").then(({ readFile }) => {
            const manifestPath = path.join(process.cwd(), "public", "assets-manifest.json");
            readFile(manifestPath, "utf-8")
              .then((c) => res.json(JSON.parse(c)))
              .catch(() => res.status(500).json({ error: "Không thể đọc assets-manifest.json" }));
          });
        });
      } catch (err: any) {
        res.status(500).json({ error: "Không thể đọc dữ liệu kho lưu trữ." });
      }
    }
  });

  // Admin API to run incremental or forced image sync
  app.post("/api/admin/download-images", requireAdmin, async (req, res) => {
    const force = Boolean(req.body?.force);
    const cmd = force ? "node scripts/download-images.mjs --force" : "node scripts/download-images.mjs";

    try {
      const { exec } = await import("child_process");
      exec(cmd, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
        if (error) {
          console.error("Download images error:", error);
          return res.status(500).json({ error: "Lỗi khi đồng bộ hình ảnh.", details: stderr || error.message });
        }
        res.json({ success: true, message: force ? "Đã làm mới toàn bộ kho ảnh!" : "Đã đồng bộ bổ sung các ảnh còn thiếu!", output: stdout });
      });
    } catch (error: any) {
      res.status(500).json({ error: "Không thể khởi chạy tiến trình tải ảnh." });
    }
  });

  // Admin API to upload/replace a building, Town Hall, or decoration image.
  // Every upload is re-encoded by sharp (resized to a sane on-web max, kept
  // to PNG) before being written to disk, so an admin can drop in a
  // full-resolution source image without thinking about file size.
  app.post("/api/admin/upload-image", requireAdmin, upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Thiếu file ảnh (field 'image')." });
      }

      const resolved = resolveUploadTarget(req.body?.target, req.body?.id, req.body?.level);
      if ("error" in resolved) {
        return res.status(400).json({ error: resolved.error });
      }
      const { relPath, maxDim } = resolved;

      let processed: Buffer;
      try {
        processed = await sharp(req.file.buffer)
          .resize({ width: maxDim, height: maxDim, fit: "inside", withoutEnlargement: true })
          .png({ compressionLevel: 9 })
          .toBuffer();
      } catch {
        return res.status(400).json({ error: "File tải lên không phải ảnh hợp lệ." });
      }

      const { mkdir, writeFile } = await import("node:fs/promises");
      const publicAbs = path.join(process.cwd(), "public", relPath);
      await mkdir(path.dirname(publicAbs), { recursive: true });
      await writeFile(publicAbs, processed);

      // Production serves the prebuilt dist/ snapshot (see the static-serving
      // branch below), not public/ directly — mirror the file there too so an
      // upload takes effect immediately instead of waiting for the next
      // `npm run build`. Best-effort: dist/ doesn't exist in dev.
      try {
        const distAbs = path.join(process.cwd(), "dist", relPath);
        await mkdir(path.dirname(distAbs), { recursive: true });
        await writeFile(distAbs, processed);
      } catch {
        // No dist/ yet (dev mode) — fine, Vite serves public/ directly.
      }

      res.json({ success: true, path: `/${relPath}`, sizeBytes: processed.length });
    } catch (error: any) {
      console.error("Upload image error:", error);
      res.status(500).json({ error: "Lỗi xử lý ảnh tải lên." });
    }
  });

  // multer throws (via next(err)) rather than rejecting the handler promise —
  // without this, a too-large upload would fall through to Express's default
  // HTML error page instead of the JSON error every other admin route returns.
  app.use("/api/admin/upload-image", (err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof multer.MulterError) {
      const message = err.code === "LIMIT_FILE_SIZE" ? "Ảnh vượt quá dung lượng cho phép (tối đa 15MB)." : "Lỗi tải file lên.";
      return res.status(400).json({ error: message });
    }
    next(err);
  });

  // Ensure NO API call ever falls through to SPA HTML
  app.all("/api/*all", (req, res) => {
    res.status(404).json({ error: `API endpoint ${req.originalUrl} không tồn tại.` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
