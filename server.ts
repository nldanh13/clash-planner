import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const apiKey = process.env.WAR_REPORT_API_KEY;
  if (!apiKey) {
    console.warn("CẢNH BÁO: Thiếu biến môi trường WAR_REPORT_API_KEY. Các yêu cầu API sẽ thất bại.");
  }

  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON
  app.use(express.json());

  // API Proxy Route for War Report
  app.use("/api/warreport", async (req, res) => {
    if (!apiKey) {
      return res.status(503).json({ error: "Chưa cấu hình WAR_REPORT_API_KEY trong biến môi trường. Vui lòng thêm WAR_REPORT_API_KEY trong phần Cài đặt." });
    }
    
    try {
      const targetUrl = `https://clashapi.colinschmale.dev${req.url}`;

      const response = await fetch(targetUrl, {
        method: req.method,
        headers: {
          "apikey": apiKey,
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      });

      const contentType = response.headers.get("content-type") || "";
      const responseText = await response.text();

      if (contentType.includes("application/json")) {
        try {
          const jsonData = JSON.parse(responseText);
          return res.status(response.status).json(jsonData);
        } catch {
          return res.status(502).json({ error: "Dữ liệu trả về từ War Report không hợp lệ (lỗi cú pháp JSON)." });
        }
      }

      return res.status(response.status >= 400 ? response.status : 502).json({
        error: response.status === 401
          ? "War Report API yêu cầu API key hợp lệ hoặc khóa đã hết hạn."
          : `War Report phản hồi mã lỗi ${response.status} (không phải định dạng JSON).`
      });
    } catch (error: any) {
      console.error("Proxy Error:", error);
      res.status(502).json({ error: "Không thể kết nối đến máy chủ War Report API." });
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
