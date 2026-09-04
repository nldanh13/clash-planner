import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

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
  app.post("/api/admin/update-data", async (req, res) => {
    const adminPassword = process.env.ADMIN_PASSWORD;
    const providedPassword = req.headers["x-admin-password"];

    if (adminPassword && providedPassword !== adminPassword) {
      return res.status(401).json({ error: "Mật khẩu quản trị không hợp lệ." });
    }

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
  app.post("/api/admin/download-images", async (req, res) => {
    const adminPassword = process.env.ADMIN_PASSWORD;
    const providedPassword = req.headers["x-admin-password"];

    if (adminPassword && providedPassword !== adminPassword) {
      return res.status(401).json({ error: "Mật khẩu quản trị không hợp lệ." });
    }

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
